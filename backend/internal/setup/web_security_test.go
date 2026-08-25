package setup

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestWebSetupServerAddressDefaultsToLoopback(t *testing.T) {
	t.Setenv("SETUP_ALLOW_REMOTE", "")
	t.Setenv("SETUP_TOKEN", "")
	address, err := WebSetupServerAddress("0.0.0.0:8080")
	require.NoError(t, err)
	require.Equal(t, "127.0.0.1:8080", address)
}

func TestWebSetupServerAddressRequiresTokenForRemote(t *testing.T) {
	t.Setenv("SETUP_ALLOW_REMOTE", "true")
	t.Setenv("SETUP_TOKEN", "")
	_, err := WebSetupServerAddress("0.0.0.0:8080")
	require.ErrorContains(t, err, "SETUP_TOKEN")
	t.Setenv("SETUP_TOKEN", "setup-secret")
	address, err := WebSetupServerAddress("0.0.0.0:8080")
	require.NoError(t, err)
	require.Equal(t, "0.0.0.0:8080", address)
}

func TestSetupMutationRoutesRequireRemoteToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	t.Setenv("DATA_DIR", t.TempDir())
	t.Setenv("SKIP_SETUP", "false")
	t.Setenv("SETUP_ALLOW_REMOTE", "true")
	t.Setenv("SETUP_TOKEN", "setup-secret")
	router := gin.New()
	RegisterRoutes(router)
	request := func(token string) *httptest.ResponseRecorder {
		recorder := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, "/setup/test-db", strings.NewReader(`{}`))
		req.Header.Set("Content-Type", "application/json")
		if token != "" {
			req.Header.Set(SetupTokenHeader, token)
		}
		router.ServeHTTP(recorder, req)
		return recorder
	}
	require.Equal(t, http.StatusUnauthorized, request("").Code)
	require.Equal(t, http.StatusUnauthorized, request("wrong-token").Code)
	require.Equal(t, http.StatusBadRequest, request("setup-secret").Code)
}

func TestSetupMutationRoutesRemainTokenlessOnLoopbackMode(t *testing.T) {
	gin.SetMode(gin.TestMode)
	t.Setenv("DATA_DIR", t.TempDir())
	t.Setenv("SKIP_SETUP", "false")
	t.Setenv("SETUP_ALLOW_REMOTE", "false")
	router := gin.New()
	RegisterRoutes(router)
	recorder := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/setup/test-db", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(recorder, req)
	require.Equal(t, http.StatusBadRequest, recorder.Code)
}
