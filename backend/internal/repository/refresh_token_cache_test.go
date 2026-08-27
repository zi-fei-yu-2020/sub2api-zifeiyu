package repository

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"
)

func newRefreshTokenCacheTestClient(t *testing.T) (*refreshTokenCache, *miniredis.Miniredis) {
	t.Helper()
	server, err := miniredis.Run()
	require.NoError(t, err)
	t.Cleanup(server.Close)
	client := redis.NewClient(&redis.Options{Addr: server.Addr()})
	t.Cleanup(func() { _ = client.Close() })
	return &refreshTokenCache{rdb: client}, server
}

func testRefreshTokenData(userID int64, familyID string, expiresAt time.Time) *service.RefreshTokenData {
	return &service.RefreshTokenData{
		UserID:       userID,
		TokenVersion: 7,
		FamilyID:     familyID,
		CreatedAt:    expiresAt.Add(-time.Hour),
		ExpiresAt:    expiresAt,
	}
}

func TestRefreshTokenCacheRotateRefreshTokenAtomically(t *testing.T) {
	ctx := context.Background()
	cache, server := newRefreshTokenCacheTestClient(t)
	oldHash := "old-hash"
	newHash := "new-hash"
	familyID := "family-1"
	oldData := testRefreshTokenData(42, familyID, time.Now().Add(30*24*time.Hour))
	newData := testRefreshTokenData(42, familyID, time.Now().Add(2*time.Hour))

	require.NoError(t, cache.StoreRefreshToken(ctx, oldHash, oldData, 30*24*time.Hour))
	require.NoError(t, cache.AddToUserTokenSet(ctx, oldData.UserID, oldHash, 30*24*time.Hour))
	require.NoError(t, cache.AddToFamilyTokenSet(ctx, familyID, oldHash, 30*24*time.Hour))

	consumedAt := time.Now().UTC().Truncate(time.Millisecond)
	result, err := cache.RotateRefreshToken(ctx, oldHash, newHash, newData, 2*time.Hour, consumedAt)
	require.NoError(t, err)
	require.Equal(t, service.RefreshTokenRotationSucceeded, result.Status)

	_, err = cache.GetRefreshToken(ctx, oldHash)
	require.ErrorIs(t, err, service.ErrRefreshTokenNotFound)
	storedNew, err := cache.GetRefreshToken(ctx, newHash)
	require.NoError(t, err)
	require.Equal(t, newData.FamilyID, storedNew.FamilyID)

	consumed, err := cache.GetConsumedRefreshToken(ctx, oldHash)
	require.NoError(t, err)
	require.Equal(t, oldData.UserID, consumed.Data.UserID)
	require.Equal(t, oldData.FamilyID, consumed.Data.FamilyID)
	require.Equal(t, consumedAt, consumed.ConsumedAt.UTC())
	require.Equal(t, consumedRefreshTokenMaxTTL, server.TTL(consumedRefreshTokenKey(oldHash)))

	userHashes, err := cache.GetUserTokenHashes(ctx, oldData.UserID)
	require.NoError(t, err)
	require.ElementsMatch(t, []string{newHash}, userHashes)
	familyHashes, err := cache.GetFamilyTokenHashes(ctx, familyID)
	require.NoError(t, err)
	require.ElementsMatch(t, []string{newHash}, familyHashes)

	reused, err := cache.RotateRefreshToken(ctx, oldHash, "unused-hash", newData, time.Hour, time.Now())
	require.NoError(t, err)
	require.Equal(t, service.RefreshTokenRotationReused, reused.Status)
	require.NotNil(t, reused.Consumed)
	require.Equal(t, familyID, reused.Consumed.Data.FamilyID)
}

func TestRefreshTokenCacheConcurrentRotationHasSingleWinner(t *testing.T) {
	ctx := context.Background()
	cache, _ := newRefreshTokenCacheTestClient(t)
	oldHash := "shared-old-hash"
	familyID := "family-concurrent"
	oldData := testRefreshTokenData(77, familyID, time.Now().Add(time.Hour))
	require.NoError(t, cache.StoreRefreshToken(ctx, oldHash, oldData, time.Hour))
	require.NoError(t, cache.AddToUserTokenSet(ctx, oldData.UserID, oldHash, time.Hour))
	require.NoError(t, cache.AddToFamilyTokenSet(ctx, familyID, oldHash, time.Hour))

	const workers = 50
	start := make(chan struct{})
	results := make(chan service.RefreshTokenRotationStatus, workers)
	errorsCh := make(chan error, workers)
	var wg sync.WaitGroup
	for index := 0; index < workers; index++ {
		wg.Add(1)
		go func(index int) {
			defer wg.Done()
			<-start
			newHash := fmt.Sprintf("new-hash-%d", index)
			newData := testRefreshTokenData(oldData.UserID, familyID, time.Now().Add(time.Hour))
			result, err := cache.RotateRefreshToken(ctx, oldHash, newHash, newData, time.Hour, time.Now())
			if err != nil {
				errorsCh <- err
				return
			}
			results <- result.Status
		}(index)
	}
	close(start)
	wg.Wait()
	close(results)
	close(errorsCh)

	for err := range errorsCh {
		require.NoError(t, err)
	}
	winners := 0
	reused := 0
	for status := range results {
		switch status {
		case service.RefreshTokenRotationSucceeded:
			winners++
		case service.RefreshTokenRotationReused:
			reused++
		}
	}
	require.Equal(t, 1, winners)
	require.Equal(t, workers-1, reused)

	familyHashes, err := cache.GetFamilyTokenHashes(ctx, familyID)
	require.NoError(t, err)
	require.Len(t, familyHashes, 1)
	_, err = cache.GetRefreshToken(ctx, oldHash)
	require.True(t, errors.Is(err, service.ErrRefreshTokenNotFound))
}

func TestRefreshTokenCacheTombstoneTTLIsBoundedByOldTokenLifetime(t *testing.T) {
	ctx := context.Background()
	cache, server := newRefreshTokenCacheTestClient(t)
	oldHash := "short-lived-old"
	newHash := "short-lived-new"
	familyID := "family-short-lived"
	oldTTL := 30 * time.Minute
	oldData := testRefreshTokenData(88, familyID, time.Now().Add(oldTTL))
	newData := testRefreshTokenData(88, familyID, time.Now().Add(2*time.Hour))

	require.NoError(t, cache.StoreRefreshToken(ctx, oldHash, oldData, oldTTL))
	require.NoError(t, cache.AddToUserTokenSet(ctx, oldData.UserID, oldHash, oldTTL))
	require.NoError(t, cache.AddToFamilyTokenSet(ctx, familyID, oldHash, oldTTL))

	result, err := cache.RotateRefreshToken(ctx, oldHash, newHash, newData, 2*time.Hour, time.Now())
	require.NoError(t, err)
	require.Equal(t, service.RefreshTokenRotationSucceeded, result.Status)
	require.Equal(t, oldTTL, server.TTL(consumedRefreshTokenKey(oldHash)))
	require.LessOrEqual(t, server.TTL(consumedRefreshTokenKey(oldHash)), consumedRefreshTokenMaxTTL)
}

func TestRefreshTokenCacheRotationMetadataMismatchFailsClosed(t *testing.T) {
	ctx := context.Background()
	cache, _ := newRefreshTokenCacheTestClient(t)
	oldHash := "metadata-old"
	newHash := "metadata-new"
	oldData := testRefreshTokenData(99, "family-original", time.Now().Add(time.Hour))
	mismatched := testRefreshTokenData(100, "family-other", time.Now().Add(time.Hour))

	require.NoError(t, cache.StoreRefreshToken(ctx, oldHash, oldData, time.Hour))
	require.NoError(t, cache.AddToUserTokenSet(ctx, oldData.UserID, oldHash, time.Hour))
	require.NoError(t, cache.AddToFamilyTokenSet(ctx, oldData.FamilyID, oldHash, time.Hour))

	result, err := cache.RotateRefreshToken(ctx, oldHash, newHash, mismatched, time.Hour, time.Now())
	require.Error(t, err)
	require.Nil(t, result)
	storedOld, getErr := cache.GetRefreshToken(ctx, oldHash)
	require.NoError(t, getErr)
	require.Equal(t, oldData.FamilyID, storedOld.FamilyID)
	_, getErr = cache.GetRefreshToken(ctx, newHash)
	require.ErrorIs(t, getErr, service.ErrRefreshTokenNotFound)
	_, getErr = cache.GetConsumedRefreshToken(ctx, oldHash)
	require.ErrorIs(t, getErr, service.ErrRefreshTokenNotFound)
}

func TestRefreshTokenCacheWrongTypeIndexFailsBeforeConsumption(t *testing.T) {
	ctx := context.Background()
	cache, server := newRefreshTokenCacheTestClient(t)
	oldHash := "wrong-type-old"
	newHash := "wrong-type-new"
	data := testRefreshTokenData(111, "family-wrong-type", time.Now().Add(time.Hour))

	require.NoError(t, cache.StoreRefreshToken(ctx, oldHash, data, time.Hour))
	server.Set(userRefreshTokensKey(data.UserID), "not-a-set")

	result, err := cache.RotateRefreshToken(ctx, oldHash, newHash, data, time.Hour, time.Now())
	require.Error(t, err)
	require.Nil(t, result)
	_, getErr := cache.GetRefreshToken(ctx, oldHash)
	require.NoError(t, getErr)
	_, getErr = cache.GetRefreshToken(ctx, newHash)
	require.ErrorIs(t, getErr, service.ErrRefreshTokenNotFound)
	_, getErr = cache.GetConsumedRefreshToken(ctx, oldHash)
	require.ErrorIs(t, getErr, service.ErrRefreshTokenNotFound)
}
