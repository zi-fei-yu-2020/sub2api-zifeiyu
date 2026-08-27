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
	mu   sync.RWMutex
	user *User
}

func (r *refreshRotationUserRepo) GetByID(context.Context, int64) (*User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if r.user == nil {
		return nil, ErrUserNotFound
	}
	cloned := *r.user
	return &cloned, nil
}

func (r *refreshRotationUserRepo) setUser(user *User) {
	r.mu.Lock()
	defer r.mu.Unlock()
	cloned := *user
	r.user = &cloned
}

type atomicRefreshTokenCacheStub struct {
	mu                sync.Mutex
	active            map[string]*RefreshTokenData
	consumed          map[string]*ConsumedRefreshTokenData
	userSets          map[int64]map[string]struct{}
	familySets        map[string]map[string]struct{}
	rotationErr       error
	consumedLookupErr error
	deleteFamilyErr   error
	deletedFamilies   []string
	rotationCalls     int
	lastSuccessorHash string
	lastSuccessorData *RefreshTokenData
}

func newAtomicRefreshTokenCacheStub() *atomicRefreshTokenCacheStub {
	return &atomicRefreshTokenCacheStub{
		active:     make(map[string]*RefreshTokenData),
		consumed:   make(map[string]*ConsumedRefreshTokenData),
		userSets:   make(map[int64]map[string]struct{}),
		familySets: make(map[string]map[string]struct{}),
	}
}

func cloneRefreshTokenDataForTest(data *RefreshTokenData) *RefreshTokenData {
	if data == nil {
		return nil
	}
	cloned := *data
	return &cloned
}

func cloneConsumedRefreshTokenDataForTest(data *ConsumedRefreshTokenData) *ConsumedRefreshTokenData {
	if data == nil {
		return nil
	}
	return &ConsumedRefreshTokenData{
		Data:       cloneRefreshTokenDataForTest(data.Data),
		ConsumedAt: data.ConsumedAt,
	}
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
	if s.consumedLookupErr != nil {
		return nil, s.consumedLookupErr
	}
	data, ok := s.consumed[tokenHash]
	if !ok {
		return nil, ErrRefreshTokenNotFound
	}
	return cloneConsumedRefreshTokenDataForTest(data), nil
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
	s.rotationCalls++
	if s.rotationErr != nil {
		return nil, s.rotationErr
	}
	oldData, ok := s.active[oldTokenHash]
	if !ok {
		if consumed, exists := s.consumed[oldTokenHash]; exists {
			return &RefreshTokenRotationResult{
				Status:   RefreshTokenRotationReused,
				Consumed: cloneConsumedRefreshTokenDataForTest(consumed),
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
	if userSet := s.userSets[oldData.UserID]; userSet != nil {
		delete(userSet, oldTokenHash)
	}
	if s.userSets[newData.UserID] == nil {
		s.userSets[newData.UserID] = make(map[string]struct{})
	}
	s.userSets[newData.UserID][newTokenHash] = struct{}{}
	if familySet := s.familySets[oldData.FamilyID]; familySet != nil {
		delete(familySet, oldTokenHash)
	}
	if s.familySets[newData.FamilyID] == nil {
		s.familySets[newData.FamilyID] = make(map[string]struct{})
	}
	s.familySets[newData.FamilyID][newTokenHash] = struct{}{}
	s.lastSuccessorHash = newTokenHash
	s.lastSuccessorData = cloneRefreshTokenDataForTest(newData)
	return &RefreshTokenRotationResult{Status: RefreshTokenRotationSucceeded}, nil
}

func (s *atomicRefreshTokenCacheStub) DeleteRefreshToken(_ context.Context, tokenHash string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.active, tokenHash)
	for _, tokenSet := range s.userSets {
		delete(tokenSet, tokenHash)
	}
	for _, tokenSet := range s.familySets {
		delete(tokenSet, tokenHash)
	}
	return nil
}

func (s *atomicRefreshTokenCacheStub) DeleteUserRefreshTokens(_ context.Context, userID int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for hash := range s.userSets[userID] {
		delete(s.active, hash)
		for _, familySet := range s.familySets {
			delete(familySet, hash)
		}
	}
	delete(s.userSets, userID)
	return nil
}

func (s *atomicRefreshTokenCacheStub) DeleteTokenFamily(_ context.Context, familyID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.deletedFamilies = append(s.deletedFamilies, familyID)
	if s.deleteFamilyErr != nil {
		return s.deleteFamilyErr
	}
	for hash := range s.familySets[familyID] {
		delete(s.active, hash)
		for _, userSet := range s.userSets {
			delete(userSet, hash)
		}
	}
	delete(s.familySets, familyID)
	return nil
}

func (s *atomicRefreshTokenCacheStub) AddToUserTokenSet(_ context.Context, userID int64, tokenHash string, _ time.Duration) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.userSets[userID] == nil {
		s.userSets[userID] = make(map[string]struct{})
	}
	s.userSets[userID][tokenHash] = struct{}{}
	return nil
}

func (s *atomicRefreshTokenCacheStub) AddToFamilyTokenSet(_ context.Context, familyID string, tokenHash string, _ time.Duration) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.familySets[familyID] == nil {
		s.familySets[familyID] = make(map[string]struct{})
	}
	s.familySets[familyID][tokenHash] = struct{}{}
	return nil
}

func (s *atomicRefreshTokenCacheStub) GetUserTokenHashes(_ context.Context, userID int64) ([]string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	result := make([]string, 0, len(s.userSets[userID]))
	for hash := range s.userSets[userID] {
		result = append(result, hash)
	}
	return result, nil
}

func (s *atomicRefreshTokenCacheStub) GetFamilyTokenHashes(_ context.Context, familyID string) ([]string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	result := make([]string, 0, len(s.familySets[familyID]))
	for hash := range s.familySets[familyID] {
		result = append(result, hash)
	}
	return result, nil
}

func (s *atomicRefreshTokenCacheStub) IsTokenInFamily(_ context.Context, familyID string, tokenHash string) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, ok := s.familySets[familyID][tokenHash]
	return ok, nil
}

type refreshRotationSettingRepo struct {
	SettingRepository
	values map[string]string
}

func (r *refreshRotationSettingRepo) GetValue(_ context.Context, key string) (string, error) {
	if value, ok := r.values[key]; ok {
		return value, nil
	}
	return "", ErrSettingNotFound
}

func newRefreshRotationAuthService(user *User, cache RefreshTokenCache) (*AuthService, *refreshRotationUserRepo) {
	cfg := &config.Config{
		JWT: config.JWTConfig{
			Secret:                   "refresh-rotation-test-secret",
			ExpireHour:               1,
			AccessTokenExpireMinutes: 15,
			RefreshTokenExpireDays:   30,
		},
	}
	repo := &refreshRotationUserRepo{}
	repo.setUser(user)
	return NewAuthService(nil, repo, nil, cache, cfg, nil, nil, nil, nil, nil, nil, nil, nil), repo
}

func enableRefreshRotationSessionBinding(service *AuthService) {
	service.settingService = NewSettingService(&refreshRotationSettingRepo{values: map[string]string{
		SettingKeySessionBindingEnabled: "true",
	}}, service.cfg)
}

func TestAuthServiceRefreshTokenPairConcurrentOnlyOneSucceeds(t *testing.T) {
	user := &User{ID: 51, Email: "rotation@example.com", Role: RoleUser, Status: StatusActive}
	cache := newAtomicRefreshTokenCacheStub()
	service, _ := newRefreshRotationAuthService(user, cache)
	pair, err := service.GenerateTokenPair(context.Background(), user, "")
	require.NoError(t, err)

	const workers = 50
	start := make(chan struct{})
	errorsCh := make(chan error, workers)
	var wg sync.WaitGroup
	for i := 0; i < workers; i++ {
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

	cache.mu.Lock()
	defer cache.mu.Unlock()
	require.Empty(t, cache.deletedFamilies, "duplicates inside the grace period must not revoke the winner")
	require.Len(t, cache.active, 1)
	require.Len(t, cache.familySets[cache.lastSuccessorData.FamilyID], 1)
}

func TestAuthServiceRefreshTokenPairRotationFailureFailsClosed(t *testing.T) {
	user := &User{ID: 52, Email: "failure@example.com", Role: RoleUser, Status: StatusActive}
	cache := newAtomicRefreshTokenCacheStub()
	service, _ := newRefreshRotationAuthService(user, cache)
	pair, err := service.GenerateTokenPair(context.Background(), user, "")
	require.NoError(t, err)
	oldHash := hashToken(pair.RefreshToken)

	cache.rotationErr = errors.New("redis unavailable")
	result, err := service.RefreshTokenPair(context.Background(), pair.RefreshToken)
	require.ErrorIs(t, err, ErrServiceUnavailable)
	require.Nil(t, result)

	cache.mu.Lock()
	defer cache.mu.Unlock()
	_, oldStillActive := cache.active[oldHash]
	require.True(t, oldStillActive)
	require.Len(t, cache.active, 1, "a failed atomic rotation must not create a successor token")
	require.Empty(t, cache.consumed)
}

func TestAuthServiceRefreshTokenPairConsumedLookupFailureFailsClosed(t *testing.T) {
	user := &User{ID: 521, Email: "lookup-failure@example.com", Role: RoleUser, Status: StatusActive}
	cache := newAtomicRefreshTokenCacheStub()
	cache.consumedLookupErr = errors.New("redis unavailable")
	service, _ := newRefreshRotationAuthService(user, cache)

	result, err := service.RefreshTokenPair(context.Background(), refreshTokenPrefix+"missing")
	require.ErrorIs(t, err, ErrServiceUnavailable)
	require.Nil(t, result)
}

func TestAuthServiceRefreshTokenReuseAfterGraceRevokesFamily(t *testing.T) {
	user := &User{ID: 53, Email: "reuse@example.com", Role: RoleUser, Status: StatusActive}
	cache := newAtomicRefreshTokenCacheStub()
	service, _ := newRefreshRotationAuthService(user, cache)
	rawToken := refreshTokenPrefix + "reused-token"
	familyID := "reused-family"
	successorHash := "successor"
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
	cache.active[successorHash] = &RefreshTokenData{UserID: user.ID, FamilyID: familyID}
	cache.familySets[familyID] = map[string]struct{}{successorHash: {}}
	cache.userSets[user.ID] = map[string]struct{}{successorHash: {}}

	_, err := service.RefreshTokenPair(context.Background(), rawToken)
	require.ErrorIs(t, err, ErrRefreshTokenReused)

	cache.mu.Lock()
	defer cache.mu.Unlock()
	require.Equal(t, []string{familyID}, cache.deletedFamilies)
	require.NotContains(t, cache.active, successorHash)
}

func TestAuthServiceRefreshTokenReuseWithinGraceKeepsFamily(t *testing.T) {
	user := &User{ID: 54, Email: "retry@example.com", Role: RoleUser, Status: StatusActive}
	cache := newAtomicRefreshTokenCacheStub()
	service, _ := newRefreshRotationAuthService(user, cache)
	rawToken := refreshTokenPrefix + "retry-token"
	familyID := "retry-family"
	successorHash := "retry-successor"
	cache.consumed[hashToken(rawToken)] = &ConsumedRefreshTokenData{
		Data:       &RefreshTokenData{UserID: user.ID, TokenVersion: resolvedTokenVersion(user), FamilyID: familyID},
		ConsumedAt: time.Now(),
	}
	cache.active[successorHash] = &RefreshTokenData{UserID: user.ID, FamilyID: familyID}
	cache.familySets[familyID] = map[string]struct{}{successorHash: {}}

	_, err := service.RefreshTokenPair(context.Background(), rawToken)
	require.ErrorIs(t, err, ErrRefreshTokenReused)

	cache.mu.Lock()
	defer cache.mu.Unlock()
	require.Empty(t, cache.deletedFamilies)
	require.Contains(t, cache.active, successorHash)
}

func TestAuthServiceRefreshTokenPairTokenVersionMismatchRevokesFamilyBeforeRotation(t *testing.T) {
	user := &User{
		ID:                   55,
		Email:                "version@example.com",
		Role:                 RoleUser,
		Status:               StatusActive,
		TokenVersion:         7,
		TokenVersionResolved: true,
	}
	cache := newAtomicRefreshTokenCacheStub()
	service, repo := newRefreshRotationAuthService(user, cache)
	pair, err := service.GenerateTokenPair(context.Background(), user, "")
	require.NoError(t, err)
	oldHash := hashToken(pair.RefreshToken)

	updated := *user
	updated.TokenVersion = 8
	repo.setUser(&updated)
	_, err = service.RefreshTokenPair(context.Background(), pair.RefreshToken)
	require.ErrorIs(t, err, ErrTokenRevoked)

	cache.mu.Lock()
	defer cache.mu.Unlock()
	require.Zero(t, cache.rotationCalls)
	require.Len(t, cache.deletedFamilies, 1)
	require.NotContains(t, cache.active, oldHash)
}

func TestAuthServiceRefreshTokenPairBindingMismatchRevokesFamilyBeforeRotation(t *testing.T) {
	user := &User{ID: 56, Email: "binding@example.com", Role: RoleUser, Status: StatusActive}
	cache := newAtomicRefreshTokenCacheStub()
	service, _ := newRefreshRotationAuthService(user, cache)
	enableRefreshRotationSessionBinding(service)
	loginCtx := WithSessionBinding(context.Background(), &SessionBinding{IP: "203.0.113.10", UserAgent: "browser-a"})
	pair, err := service.GenerateTokenPair(loginCtx, user, "")
	require.NoError(t, err)

	refreshCtx := WithSessionBinding(context.Background(), &SessionBinding{IP: "203.0.113.11", UserAgent: "browser-a"})
	_, err = service.RefreshTokenPair(refreshCtx, pair.RefreshToken)
	require.ErrorIs(t, err, ErrSessionBindingMismatch)

	cache.mu.Lock()
	defer cache.mu.Unlock()
	require.Zero(t, cache.rotationCalls)
	require.Len(t, cache.deletedFamilies, 1)
	require.Empty(t, cache.active)
}

func TestAuthServiceRefreshTokenPairPreservesFamilyBindingVersionAndRole(t *testing.T) {
	user := &User{
		ID:                   57,
		Email:                "admin@example.com",
		Role:                 RoleAdmin,
		Status:               StatusActive,
		TokenVersion:         12,
		TokenVersionResolved: true,
	}
	cache := newAtomicRefreshTokenCacheStub()
	service, _ := newRefreshRotationAuthService(user, cache)
	enableRefreshRotationSessionBinding(service)
	ctx := WithSessionBinding(context.Background(), &SessionBinding{IP: "198.51.100.25", UserAgent: "admin-browser"})
	pair, err := service.GenerateTokenPair(ctx, user, "")
	require.NoError(t, err)
	oldHash := hashToken(pair.RefreshToken)

	cache.mu.Lock()
	original := cloneRefreshTokenDataForTest(cache.active[oldHash])
	cache.mu.Unlock()
	require.NotNil(t, original)

	rotated, err := service.RefreshTokenPair(ctx, pair.RefreshToken)
	require.NoError(t, err)
	require.Equal(t, RoleAdmin, rotated.UserRole, "backend mode checks depend on the refreshed user's role")
	require.NotEqual(t, pair.RefreshToken, rotated.RefreshToken)

	claims, err := service.ValidateToken(rotated.AccessToken)
	require.NoError(t, err)
	require.Equal(t, original.FamilyID, claims.SessionID)
	require.Equal(t, original.BindingHash, claims.BindingHash)
	require.Equal(t, user.TokenVersion, claims.TokenVersion)

	cache.mu.Lock()
	defer cache.mu.Unlock()
	successor := cache.active[hashToken(rotated.RefreshToken)]
	require.NotNil(t, successor)
	require.Equal(t, original.FamilyID, successor.FamilyID)
	require.Equal(t, original.BindingHash, successor.BindingHash)
	require.Equal(t, user.TokenVersion, successor.TokenVersion)
	_, oldActive := cache.active[oldHash]
	require.False(t, oldActive)
	require.Contains(t, cache.familySets[original.FamilyID], hashToken(rotated.RefreshToken))
	require.Contains(t, cache.userSets[user.ID], hashToken(rotated.RefreshToken))
}
