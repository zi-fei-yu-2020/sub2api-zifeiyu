package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

const refreshTokenCookieName = "sub2api_refresh_token"
const refreshTokenCookiePath = "/api/v1/auth"

func setRefreshTokenCookie(c *gin.Context, token string, maxAge int) {
	if c == nil || strings.TrimSpace(token) == "" || maxAge <= 0 {
		return
	}
	http.SetCookie(c.Writer, &http.Cookie{
		Name: refreshTokenCookieName, Value: token, Path: refreshTokenCookiePath,
		MaxAge: maxAge, HttpOnly: true, Secure: isRequestHTTPS(c), SameSite: http.SameSiteLaxMode,
	})
}

func readRefreshTokenCookie(c *gin.Context) string {
	if c == nil {
		return ""
	}
	cookie, err := c.Cookie(refreshTokenCookieName)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(cookie)
}

func clearRefreshTokenCookie(c *gin.Context) {
	if c == nil {
		return
	}
	http.SetCookie(c.Writer, &http.Cookie{
		Name: refreshTokenCookieName, Value: "", Path: refreshTokenCookiePath,
		MaxAge: -1, HttpOnly: true, Secure: isRequestHTTPS(c), SameSite: http.SameSiteLaxMode,
	})
}
