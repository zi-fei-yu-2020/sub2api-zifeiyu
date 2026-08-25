package service

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/stretchr/testify/require"
)

type refreshRotationUserRepo struct {
	UserRepository
	user *User
}

func (r *refreshRotationUserRepo) GetByID(context.Context, int64) (*User, error) {
	if r.user == nil {
		return nil, ErrUserNotFound
	}
	cloned := *r.user
	return &cloned, nil
}

type atomicRefreshTokenCacheStub struct {
	mu              sync.Mutex
	active          map[string]*RefreshTokenData
	consumed        map[string]*ConsumedRefreshTokenData
	rotationErr     error
	deletedFamilies []string
}

func newAtomicRefreshTokenCacheStub() *atomicRefreshTokenCacheStub {
	return &atomicRefreshTokenCacheStub{
		active:   make(map[string]*RefreshTokenData),
		consumed: make(map[string]*ConsumedRefreshTokenData),
	}
}

func cloneRefreshTokenDataForTest(data *RefreshTokenData) *RefreshTokenData {
	if data == nil {
		return nil
	}
	cloned := *data
	return &cloned
}

func (s *atomicRefreshTokenCacheStub) StoreRefreshToken(_ context.Context, tokenHash string, data *RefreshTokenData, _ time.Duration) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.active[tokenHash] = cloneRefreshTokenDataForTest(data)
	return nil
}

func (s *atomicRefreshTokenCacheStub) GetRefreshToken(_ context.Context, tokenHash string) (*RefreshTokenData, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	data, ok := s.active[tokenHash]
	if !ok {
		return nil, ErrRefreshTokenNotFound
	}
	return cloneRefreshTokenDataForTest(data), nil
}

func (s *atomicRefreshTokenCacheStub) GetConsumedRefreshToken(_ context.Context, tokenHash string) (*ConsumedRefreshTokenData, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	data, ok := s.consumed[tokenHash]
	if !ok {
		return nil, ErrRefreshTokenNotFound
	}
	return &ConsumedRefreshTokenData{
		Data:       cloneRefreshTokenDataForTest(data.Data),
		ConsumedAt: data.ConsumedAt,
	}, nil
}

func (s *atomicRefreshTokenCacheStub) RotateRefreshToken(
	_ context.Context,
	oldTokenHash string,
	newTokenHash string,
	newData *RefreshTokenData,
	_ time.Duration,
	consumedAt time.Time,
) (*RefreshTokenRotationResult, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.rotationErr != nil {
		return nil, s.rotationErr
	}
	oldData, ok := s.active[oldTokenHash]
	if !ok {
		if consumed, exists := s.consumed[oldTokenHash]; exists {
			return &RefreshTokenRotationResult{
				Status: RefreshTokenRotationReused,
				Consumed: &ConsumedRefreshTokenData{
					Data:       cloneRefreshTokenDataForTest(consumed.Data),
					ConsumedAt: consumed.ConsumedAt,
				},
			}, nil
		}
		return &RefreshTokenRotationResult{Status: RefreshTokenRotationNotFound}, nil
	}
	delete(s.active, oldTokenHash)
	s.consumed[oldTokenHash] = &ConsumedRefreshTokenData{
		Data:       cloneRefreshTokenDataForTest(oldData),
		ConsumedAt: consumedAt,
	}
	s.active[newTokenHash] = cloneRefreshTokenDataForTest(newData)
	return &RefreshTokenRotationResult{Status: RefreshTokenRotationSucceeded}, nil
}

func (s *atomicRefreshTokenCacheStub) DeleteRefreshToken(_ context.Context, tokenHash string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.active, tokenHash)
	return nil
}

func (s *atomicRefreshTokenCacheStub) DeleteUserRefreshTokens(_ context.Context, userID int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for hash, data := range s.active {
		if data.UserID == userID {
			delete(s.active, hash)
		}
	}
	return nil
}

func (s *atomicRefreshTokenCacheStub) DeleteTokenFamily(_ context.Context, familyID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.deletedFamilies = append(s.deletedFamilies, familyID)
	for hash, data := range s.active {
		if data.FamilyID == familyID {
			delete(s.active, hash)
		}
	}
	return nil
}

func (s *atomicRefreshTokenCacheStub) AddToUserTokenSet(context.Context, int64, string, time.Duration) error {
	return nil
}

func (s *atomicRefreshTokenCacheStub) AddToFamilyTokenSet(context.Context, string, string, time.Duration) error {
	return nil
}

func (s *atomicRefreshTokenCacheStub) GetUserTokenHashes(context.Context, int64) ([]string, error) {
	return nil, nil
}

func (s *atomicRefreshTokenCacheStub) GetFamilyTokenHashes(context.Context, string) ([]string, error) {
	return nil, nil
}

func (s *atomicRefreshTokenCacheStub) IsTokenInFamily(context.Context, string, string) (bool, error) {
	return false, nil
}

func newRefreshRotationAuthService(user *User, cache RefreshTokenCache) *AuthService {
	cfg := &config.Config{
		JWT: config.JWTConfig{
			Secret:                   "refresh-rotation-test-secret",
			ExpireHour:               1,
			AccessTokenExpireMinutes: 15,
			RefreshTokenExpireDays:   30,
		},
	}
	return NewAuthService(
		nil,
		&refreshRotationUserRepo{user: user},
		nil,
		cache,
		cfg,
		nil,
		nil,
		nil,
		nil,
		nil,
		nil,
		nil,
		nil,
	)
}

func TestAuthServiceRefreshTokenPairConcurrentOnlyOneSucceeds(t *testing.T) {
	user := &User{ID: 51, Email: "rotation@example.com", Role: RoleUser, Status: StatusActive}
	cache := newAtomicRefreshTokenCacheStub()
	service := newRefreshRotationAuthService(user, cache)
	pair, err := service.GenerateTokenPair(context.Background(), user, "")
	require.NoError(t, err)

	const workers = 32
	start := make(chan struct{})
	errorsCh := make(chan error, workers)
	var wg sync.WaitGroup
	for range workers {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-start
			_, refreshErr := service.RefreshTokenPair(context.Background(), pair.RefreshToken)
			errorsCh <- refreshErr
		}()
	}
	close(start)
	wg.Wait()
	close(errorsCh)

	successes := 0
	reused := 0
	for refreshErr := range errorsCh {
		switch {
		case refreshErr == nil:
			successes++
		case errors.Is(refreshErr, ErrRefreshTokenReused):
			reused++
		default:
			t.Fatalf("unexpected refresh error: %v", refreshErr)
		}
	}
	require.Equal(t, 1, successes)
	require.Equal(t, workers-1, reused)
	require.Empty(t, cache.deletedFamilies, "duplicates inside the grace period must not revoke the winner")
}

func TestAuthServiceRefreshTokenPairRotationFailureFailsClosed(t *testing.T) {
	user := &User{ID: 52, Email: "failure@example.com", Role: RoleUser, Status: StatusActive}
	cache := newAtomicRefreshTokenCacheStub()
	service := newRefreshRotationAuthService(user, cache)
	pair, err := service.GenerateTokenPair(context.Background(), user, "")
	require.NoError(t, err)
	oldHash := hashToken(pair.RefreshToken)

	cache.rotationErr = errors.New("redis unavailable")
	_, err = service.RefreshTokenPair(context.Background(), pair.RefreshToken)
	require.ErrorIs(t, err, ErrServiceUnavailable)

	cache.mu.Lock()
	_, oldStillActive := cache.active[oldHash]
	activeCount := len(cache.active)
	cache.mu.Unlock()
	require.True(t, oldStillActive)
	require.Equal(t, 1, activeCount, "a failed atomic rotation must not create a successor token")
}

func TestAuthServiceRefreshTokenReuseAfterGraceRevokesFamily(t *testing.T) {
	user := &User{ID: 53, Email: "reuse@example.com", Role: RoleUser, Status: StatusActive}
	cache := newAtomicRefreshTokenCacheStub()
	service := newRefreshRotationAuthService(user, cache)
	rawToken := refreshTokenPrefix + "reused-token"
	familyID := "reused-family"
	cache.consumed[hashToken(rawToken)] = &ConsumedRefreshTokenData{
		Data: &RefreshTokenData{
			UserID:       user.ID,
			TokenVersion: resolvedTokenVersion(user),
			FamilyID:     familyID,
			CreatedAt:    time.Now().Add(-time.Hour),
			ExpiresAt:    time.Now().Add(time.Hour),
		},
		ConsumedAt: time.Now().Add(-refreshTokenReuseGracePeriod - time.Second),
	}

	_, err := service.RefreshTokenPair(context.Background(), rawToken)
	require.ErrorIs(t, err, ErrRefreshTokenReused)
	require.Equal(t, []string{familyID}, cache.deletedFamilies)
}
