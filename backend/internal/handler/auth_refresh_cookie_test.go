package handler

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

type refreshCookieUserRepo struct {
	service.UserRepository
	user *service.User
}

func (r *refreshCookieUserRepo) GetByID(context.Context, int64) (*service.User, error) {
	cloned := *r.user
	return &cloned, nil
}

type refreshCookieCache struct {
	mu              sync.Mutex
	active          map[string]*service.RefreshTokenData
	consumed        map[string]*service.ConsumedRefreshTokenData
	deletedFamilies []string
}

func newRefreshCookieCache() *refreshCookieCache {
	return &refreshCookieCache{
		active:   make(map[string]*service.RefreshTokenData),
		consumed: make(map[string]*service.ConsumedRefreshTokenData),
	}
}

func cloneRefreshCookieData(data *service.RefreshTokenData) *service.RefreshTokenData {
	if data == nil {
		return nil
	}
	cloned := *data
	return &cloned
}

func (c *refreshCookieCache) StoreRefreshToken(_ context.Context, tokenHash string, data *service.RefreshTokenData, _ time.Duration) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.active[tokenHash] = cloneRefreshCookieData(data)
	return nil
}

func (c *refreshCookieCache) GetRefreshToken(_ context.Context, tokenHash string) (*service.RefreshTokenData, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	data, ok := c.active[tokenHash]
	if !ok {
		return nil, service.ErrRefreshTokenNotFound
	}
	return cloneRefreshCookieData(data), nil
}

func (c *refreshCookieCache) DeleteRefreshToken(_ context.Context, tokenHash string) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.active, tokenHash)
	return nil
}

func (c *refreshCookieCache) DeleteUserRefreshTokens(context.Context, int64) error { return nil }

func (c *refreshCookieCache) DeleteTokenFamily(_ context.Context, familyID string) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.deletedFamilies = append(c.deletedFamilies, familyID)
	for hash, data := range c.active {
		if data != nil && data.FamilyID == familyID {
			delete(c.active, hash)
		}
	}
	return nil
}

func (c *refreshCookieCache) AddToUserTokenSet(context.Context, int64, string, time.Duration) error {
	return nil
}

func (c *refreshCookieCache) AddToFamilyTokenSet(context.Context, string, string, time.Duration) error {
	return nil
}

func (c *refreshCookieCache) GetUserTokenHashes(context.Context, int64) ([]string, error) {
	return nil, nil
}

func (c *refreshCookieCache) GetFamilyTokenHashes(context.Context, string) ([]string, error) {
	return nil, nil
}

func (c *refreshCookieCache) IsTokenInFamily(context.Context, string, string) (bool, error) {
	return false, nil
}

func (c *refreshCookieCache) GetConsumedRefreshToken(_ context.Context, tokenHash string) (*service.ConsumedRefreshTokenData, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	data, ok := c.consumed[tokenHash]
	if !ok {
		return nil, service.ErrRefreshTokenNotFound
	}
	return &service.ConsumedRefreshTokenData{
		Data:       cloneRefreshCookieData(data.Data),
		ConsumedAt: data.ConsumedAt,
	}, nil
}

func (c *refreshCookieCache) RotateRefreshToken(
	_ context.Context,
	oldTokenHash string,
	newTokenHash string,
	newData *service.RefreshTokenData,
	_ time.Duration,
	consumedAt time.Time,
) (*service.RefreshTokenRotationResult, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	oldData, ok := c.active[oldTokenHash]
	if !ok {
		if consumed, reused := c.consumed[oldTokenHash]; reused {
			return &service.RefreshTokenRotationResult{
				Status: service.RefreshTokenRotationReused,
				Consumed: &service.ConsumedRefreshTokenData{
					Data:       cloneRefreshCookieData(consumed.Data),
					ConsumedAt: consumed.ConsumedAt,
				},
			}, nil
		}
		return &service.RefreshTokenRotationResult{Status: service.RefreshTokenRotationNotFound}, nil
	}
	delete(c.active, oldTokenHash)
	c.consumed[oldTokenHash] = &service.ConsumedRefreshTokenData{
		Data:       cloneRefreshCookieData(oldData),
		ConsumedAt: consumedAt,
	}
	c.active[newTokenHash] = cloneRefreshCookieData(newData)
	return &service.RefreshTokenRotationResult{Status: service.RefreshTokenRotationSucceeded}, nil
}

func newRefreshCookieTestHandler() (*AuthHandler, *service.AuthService, *refreshCookieCache, *service.User) {
	user := &service.User{
		ID:           71,
		Email:        "cookie@example.com",
		Username:     "cookie-user",
		PasswordHash: "password-hash",
		Role:         service.RoleUser,
		Status:       service.StatusActive,
	}
	cache := newRefreshCookieCache()
	cfg := &config.Config{JWT: config.JWTConfig{
		Secret:                   "refresh-cookie-test-secret",
		ExpireHour:               1,
		AccessTokenExpireMinutes: 15,
		RefreshTokenExpireDays:   7,
	}}
	authService := service.NewAuthService(
		nil,
		&refreshCookieUserRepo{user: user},
		nil,
		cache,
		cfg,
		nil, nil, nil, nil, nil, nil, nil, nil,
	)
	return &AuthHandler{authService: authService}, authService, cache, user
}

func hashRefreshCookieToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func findRefreshCookie(cookies []*http.Cookie) *http.Cookie {
	for _, cookie := range cookies {
		if cookie.Name == refreshTokenCookieName {
			return cookie
		}
	}
	return nil
}

func decodeAuthData(t *testing.T, recorder *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var body struct {
		Code int            `json:"code"`
		Data map[string]any `json:"data"`
	}
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &body))
	require.Zero(t, body.Code)
	return body.Data
}

func TestRefreshTokenCookieLifecycle(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodPost, "https://example.com/api/v1/auth/login", nil)

	setRefreshTokenCookie(ctx, "rt_secret", 3600)
	cookie := findRefreshCookie(recorder.Result().Cookies())
	require.NotNil(t, cookie)
	require.Equal(t, refreshTokenCookiePath, cookie.Path)
	require.True(t, cookie.HttpOnly)
	require.True(t, cookie.Secure)
	require.Equal(t, http.SameSiteLaxMode, cookie.SameSite)
	require.Equal(t, 3600, cookie.MaxAge)

	readRecorder := httptest.NewRecorder()
	readCtx, _ := gin.CreateTestContext(readRecorder)
	readCtx.Request = httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", nil)
	readCtx.Request.AddCookie(cookie)
	require.Equal(t, "rt_secret", readRefreshTokenCookie(readCtx))

	clearRefreshTokenCookie(readCtx)
	cleared := findRefreshCookie(readRecorder.Result().Cookies())
	require.NotNil(t, cleared)
	require.Equal(t, -1, cleared.MaxAge)
	require.True(t, cleared.HttpOnly)
}

func TestBrowserLoginUsesHttpOnlyCookieWithoutReturningRefreshToken(t *testing.T) {
	_, authService, _, user := newRefreshCookieTestHandler()
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodPost, "https://example.com/api/v1/auth/login", nil)
	ctx.Request.Header.Set(browserRequestHeader, browserRequestValue)

	respondWithTokenPair(ctx, authService, user)

	require.Equal(t, http.StatusOK, recorder.Code)
	data := decodeAuthData(t, recorder)
	require.Equal(t, true, data["refresh_cookie"])
	require.NotContains(t, data, "refresh_token")
	cookie := findRefreshCookie(recorder.Result().Cookies())
	require.NotNil(t, cookie)
	require.True(t, cookie.HttpOnly)
	require.True(t, cookie.Secure)
	require.Equal(t, 7*24*60*60, cookie.MaxAge)
}

func TestNonBrowserLoginKeepsJSONRefreshTokenCompatibility(t *testing.T) {
	_, authService, _, user := newRefreshCookieTestHandler()
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", nil)

	respondWithTokenPair(ctx, authService, user)

	data := decodeAuthData(t, recorder)
	require.NotEmpty(t, data["refresh_token"])
	require.NotContains(t, data, "refresh_cookie")
	require.Nil(t, findRefreshCookie(recorder.Result().Cookies()))
}

func TestNonBrowserRefreshKeepsJSONTokenCompatibility(t *testing.T) {
	handler, authService, _, user := newRefreshCookieTestHandler()
	pair, err := authService.GenerateTokenPair(context.Background(), user, "api-family")
	require.NoError(t, err)
	body, err := json.Marshal(RefreshTokenRequest{RefreshToken: pair.RefreshToken})
	require.NoError(t, err)
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", bytes.NewReader(body))
	ctx.Request.Header.Set("Content-Type", "application/json")

	handler.RefreshToken(ctx)

	require.Equal(t, http.StatusOK, recorder.Code)
	data := decodeAuthData(t, recorder)
	require.NotEmpty(t, data["refresh_token"])
	require.NotContains(t, data, "refresh_cookie")
	require.Nil(t, findRefreshCookie(recorder.Result().Cookies()))
}

func TestRefreshMigratesLegacyJSONTokenToCookieAndPrefersExistingCookie(t *testing.T) {
	handler, authService, cache, user := newRefreshCookieTestHandler()
	legacyPair, err := authService.GenerateTokenPair(context.Background(), user, "legacy-family")
	require.NoError(t, err)

	body, err := json.Marshal(RefreshTokenRequest{RefreshToken: legacyPair.RefreshToken})
	require.NoError(t, err)
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", bytes.NewReader(body))
	ctx.Request.Header.Set("Content-Type", "application/json")
	ctx.Request.Header.Set(browserRequestHeader, browserRequestValue)

	handler.RefreshToken(ctx)

	require.Equal(t, http.StatusOK, recorder.Code)
	data := decodeAuthData(t, recorder)
	require.Equal(t, true, data["refresh_cookie"])
	require.NotContains(t, data, "refresh_token")
	cookie := findRefreshCookie(recorder.Result().Cookies())
	require.NotNil(t, cookie)
	require.NotEmpty(t, cookie.Value)
	_, oldActive := cache.active[hashRefreshCookieToken(legacyPair.RefreshToken)]
	_, newActive := cache.active[hashRefreshCookieToken(cookie.Value)]
	require.False(t, oldActive)
	require.True(t, newActive)

	bodyPair, err := authService.GenerateTokenPair(context.Background(), user, "body-family")
	require.NoError(t, err)
	precedenceBody, err := json.Marshal(RefreshTokenRequest{RefreshToken: bodyPair.RefreshToken})
	require.NoError(t, err)
	precedenceRecorder := httptest.NewRecorder()
	precedenceCtx, _ := gin.CreateTestContext(precedenceRecorder)
	precedenceCtx.Request = httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", bytes.NewReader(precedenceBody))
	precedenceCtx.Request.Header.Set("Content-Type", "application/json")
	precedenceCtx.Request.AddCookie(cookie)

	handler.RefreshToken(precedenceCtx)

	require.Equal(t, http.StatusOK, precedenceRecorder.Code)
	_, bodyStillActive := cache.active[hashRefreshCookieToken(bodyPair.RefreshToken)]
	require.True(t, bodyStillActive, "cookie token must take precedence over JSON token")
}

func TestLogoutClearsCookieAndRevokesFamilyAfterRotation(t *testing.T) {
	handler, authService, cache, user := newRefreshCookieTestHandler()
	pair, err := authService.GenerateTokenPair(context.Background(), user, "logout-family")
	require.NoError(t, err)
	_, err = authService.RefreshTokenPair(context.Background(), pair.RefreshToken)
	require.NoError(t, err)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/api/v1/auth/logout", bytes.NewReader([]byte(`{}`)))
	ctx.Request.Header.Set("Content-Type", "application/json")
	ctx.Request.AddCookie(&http.Cookie{Name: refreshTokenCookieName, Value: pair.RefreshToken})

	handler.Logout(ctx)

	require.Equal(t, http.StatusOK, recorder.Code)
	require.Contains(t, cache.deletedFamilies, "logout-family")
	cleared := findRefreshCookie(recorder.Result().Cookies())
	require.NotNil(t, cleared)
	require.Equal(t, -1, cleared.MaxAge)
	for _, data := range cache.active {
		require.NotEqual(t, "logout-family", data.FamilyID)
	}
}
