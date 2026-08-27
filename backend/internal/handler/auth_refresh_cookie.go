package handler

import (
	"net/http"
	"strings"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
)

const (
	refreshTokenCookieName = "sub2api_refresh_token"
	refreshTokenCookiePath = "/api/v1/auth"
	browserRequestHeader   = "X-Requested-With"
	browserRequestValue    = "XMLHttpRequest"
)

// requestPrefersRefreshTokenCookie identifies browser authentication requests while preserving
// JSON refresh-token responses for non-browser API clients. The standard AJAX header is used by the
// bundled frontend and is already allowed by the project CORS policy; Fetch Metadata and Origin cover OAuth completion views that call apiClient
// directly and browser navigations returning from an OAuth provider.
func requestPrefersRefreshTokenCookie(c *gin.Context) bool {
	if c == nil || c.Request == nil {
		return false
	}
	if readRefreshTokenCookie(c) != "" {
		return true
	}
	if strings.EqualFold(strings.TrimSpace(c.GetHeader(browserRequestHeader)), browserRequestValue) {
		return true
	}
	if strings.TrimSpace(c.GetHeader("Sec-Fetch-Site")) != "" || strings.TrimSpace(c.GetHeader("Sec-Fetch-Mode")) != "" {
		return true
	}
	return strings.TrimSpace(c.GetHeader("Origin")) != ""
}

// selectRefreshToken gives an HttpOnly cookie priority over a JSON token. When no cookie exists,
// a legacy browser can submit its localStorage token once and request migration to cookie transport.
func selectRefreshToken(c *gin.Context, jsonToken string) (token string, cookieTransport bool) {
	if cookieToken := readRefreshTokenCookie(c); cookieToken != "" {
		return cookieToken, true
	}
	return strings.TrimSpace(jsonToken), requestPrefersRefreshTokenCookie(c)
}

// issueRefreshToken returns the token only for JSON-compatible API clients. Browser requests get
// an HttpOnly cookie plus a boolean response marker and never receive the raw refresh token.
func issueRefreshToken(c *gin.Context, authService *service.AuthService, token string, forceCookie bool) (jsonToken string, cookieTransport bool) {
	if forceCookie || requestPrefersRefreshTokenCookie(c) {
		maxAge := 0
		if authService != nil {
			maxAge = authService.GetRefreshTokenExpiresIn()
		}
		setRefreshTokenCookie(c, token, maxAge)
		return "", true
	}
	return strings.TrimSpace(token), false
}

func setRefreshTokenCookie(c *gin.Context, token string, maxAge int) {
	if c == nil || c.Writer == nil || strings.TrimSpace(token) == "" || maxAge <= 0 {
		return
	}
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     refreshTokenCookieName,
		Value:    token,
		Path:     refreshTokenCookiePath,
		MaxAge:   maxAge,
		Expires:  time.Now().UTC().Add(time.Duration(maxAge) * time.Second),
		HttpOnly: true,
		Secure:   isRequestHTTPS(c),
		SameSite: http.SameSiteLaxMode,
	})
}

func readRefreshTokenCookie(c *gin.Context) string {
	if c == nil || c.Request == nil {
		return ""
	}
	cookie, err := c.Request.Cookie(refreshTokenCookieName)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(cookie.Value)
}

func clearRefreshTokenCookie(c *gin.Context) {
	if c == nil || c.Writer == nil {
		return
	}
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     refreshTokenCookieName,
		Value:    "",
		Path:     refreshTokenCookiePath,
		MaxAge:   -1,
		Expires:  time.Unix(1, 0).UTC(),
		HttpOnly: true,
		Secure:   isRequestHTTPS(c),
		SameSite: http.SameSiteLaxMode,
	})
}
