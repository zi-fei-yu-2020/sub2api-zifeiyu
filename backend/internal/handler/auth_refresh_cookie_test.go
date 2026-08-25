package handler

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestRefreshTokenCookieLifecycle(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodPost, "https://example.com/api/v1/auth/login", nil)

	setRefreshTokenCookie(ctx, "rt_secret", 3600)
	cookies := recorder.Result().Cookies()
	require.Len(t, cookies, 1)
	cookie := cookies[0]
	require.Equal(t, refreshTokenCookieName, cookie.Name)
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
	cleared := readRecorder.Result().Cookies()
	require.Len(t, cleared, 1)
	require.Equal(t, -1, cleared[0].MaxAge)
	require.True(t, cleared[0].HttpOnly)
}
