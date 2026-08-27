package setup

import (
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestWebSetupServerAddressDefaultsToLoopback(t *testing.T) {
	t.Setenv(setupAllowRemoteEnv, "")
	t.Setenv(setupTokenEnv, "")

	for _, configuredAddress := range []string{"0.0.0.0:8080", "192.0.2.20:9090", "[::]:8181"} {
		configuredAddress := configuredAddress
		t.Run(configuredAddress, func(t *testing.T) {
			address, err := WebSetupServerAddress(configuredAddress)
			require.NoError(t, err)
			_, configuredPort, err := netSplitHostPortForTest(configuredAddress)
			require.NoError(t, err)
			require.Equal(t, "127.0.0.1:"+configuredPort, address)
		})
	}
}

func TestWebSetupServerAddressRequiresExplicitRemoteOptInAndToken(t *testing.T) {
	t.Setenv(setupAllowRemoteEnv, "true")
	t.Setenv(setupTokenEnv, "")

	_, err := WebSetupServerAddress("0.0.0.0:8080")
	require.ErrorContains(t, err, setupTokenEnv)

	t.Setenv(setupTokenEnv, "remote-setup-secret")
	address, err := WebSetupServerAddress("0.0.0.0:8080")
	require.NoError(t, err)
	require.Equal(t, "0.0.0.0:8080", address)
}

func TestWebSetupServerAddressRejectsInvalidAddresses(t *testing.T) {
	t.Setenv(setupAllowRemoteEnv, "false")
	for _, configuredAddress := range []string{"", "0.0.0.0", "0.0.0.0:0", "0.0.0.0:70000", "0.0.0.0:http"} {
		_, err := WebSetupServerAddress(configuredAddress)
		require.Error(t, err, configuredAddress)
	}
}

func TestValidWebSetupToken(t *testing.T) {
	t.Setenv(setupTokenEnv, "remote-setup-secret")
	require.True(t, validWebSetupToken("remote-setup-secret"))
	require.True(t, validWebSetupToken("  remote-setup-secret  "))
	require.False(t, validWebSetupToken(""))
	require.False(t, validWebSetupToken("remote-setup-secre"))
	require.False(t, validWebSetupToken("remote-setup-secret-extra"))
	require.False(t, validWebSetupToken("wrong-token"))
}

func TestSetupStatusReportsWhetherTokenIsRequired(t *testing.T) {
	gin.SetMode(gin.TestMode)
	t.Setenv("DATA_DIR", t.TempDir())
	t.Setenv("SKIP_SETUP", "false")

	for _, testCase := range []struct {
		name        string
		allowRemote string
		want        string
	}{
		{name: "local", allowRemote: "false", want: `"requires_token":false`},
		{name: "remote", allowRemote: "true", want: `"requires_token":true`},
	} {
		t.Run(testCase.name, func(t *testing.T) {
			t.Setenv(setupAllowRemoteEnv, testCase.allowRemote)
			router := gin.New()
			RegisterRoutes(router)
			recorder := httptest.NewRecorder()
			request := httptest.NewRequest(http.MethodGet, "/setup/status", nil)
			request.RemoteAddr = "192.0.2.10:43210"
			router.ServeHTTP(recorder, request)
			require.Equal(t, http.StatusOK, recorder.Code)
			require.Contains(t, recorder.Body.String(), testCase.want)
		})
	}
}

func TestSetupMutationRoutesRequireRemoteToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	t.Setenv("DATA_DIR", t.TempDir())
	t.Setenv("SKIP_SETUP", "false")
	t.Setenv(setupAllowRemoteEnv, "true")
	t.Setenv(setupTokenEnv, "remote-setup-secret")

	router := gin.New()
	RegisterRoutes(router)
	for _, path := range []string{"/setup/test-db", "/setup/test-redis", "/setup/install"} {
		path := path
		t.Run(path, func(t *testing.T) {
			require.Equal(t, http.StatusUnauthorized, performSetupRequest(router, path, "192.0.2.10:43210", "").Code)
			require.Equal(t, http.StatusUnauthorized, performSetupRequest(router, path, "192.0.2.10:43210", "wrong-token").Code)
			// A 400 response proves the request passed the guard and reached the JSON validator.
			require.Equal(t, http.StatusBadRequest, performSetupRequest(router, path, "192.0.2.10:43210", "remote-setup-secret").Code)
		})
	}
}

func TestSetupMutationRoutesRejectRemoteSourcesInLocalMode(t *testing.T) {
	gin.SetMode(gin.TestMode)
	t.Setenv("DATA_DIR", t.TempDir())
	t.Setenv("SKIP_SETUP", "false")
	t.Setenv(setupAllowRemoteEnv, "false")
	t.Setenv(setupTokenEnv, "remote-setup-secret")

	router := gin.New()
	RegisterRoutes(router)
	for _, path := range []string{"/setup/test-db", "/setup/test-redis", "/setup/install"} {
		path := path
		t.Run(path, func(t *testing.T) {
			remoteRequest := performSetupRequest(router, path, "192.0.2.10:43210", "remote-setup-secret")
			require.Equal(t, http.StatusForbidden, remoteRequest.Code)

			// Forwarded headers must not turn a remote TCP peer into a local request.
			spoofedRequest := httptest.NewRequest(http.MethodPost, path, strings.NewReader(`{}`))
			spoofedRequest.Header.Set("Content-Type", "application/json")
			spoofedRequest.Header.Set("X-Forwarded-For", "127.0.0.1")
			spoofedRequest.Header.Set("X-Real-IP", "127.0.0.1")
			spoofedRequest.RemoteAddr = "192.0.2.10:43210"
			spoofedRecorder := httptest.NewRecorder()
			router.ServeHTTP(spoofedRecorder, spoofedRequest)
			require.Equal(t, http.StatusForbidden, spoofedRecorder.Code)

			localRequest := performSetupRequest(router, path, "127.0.0.1:43210", "")
			require.Equal(t, http.StatusBadRequest, localRequest.Code)
		})
	}
}

func TestSetupMutationGuardHandlesConcurrentTokenChecks(t *testing.T) {
	gin.SetMode(gin.TestMode)
	t.Setenv("DATA_DIR", t.TempDir())
	t.Setenv("SKIP_SETUP", "false")
	t.Setenv(setupAllowRemoteEnv, "true")
	t.Setenv(setupTokenEnv, "remote-setup-secret")

	router := gin.New()
	RegisterRoutes(router)

	paths := []string{"/setup/test-db", "/setup/test-redis", "/setup/install"}
	const requestCount = 60
	results := make(chan int, requestCount)
	var waitGroup sync.WaitGroup
	for index := 0; index < requestCount; index++ {
		index := index
		waitGroup.Add(1)
		go func() {
			defer waitGroup.Done()
			token := "wrong-token"
			if index%2 == 0 {
				token = "remote-setup-secret"
			}
			path := paths[index%len(paths)]
			results <- performSetupRequest(router, path, "192.0.2.10:43210", token).Code
		}()
	}
	waitGroup.Wait()
	close(results)

	accepted := 0
	rejected := 0
	for status := range results {
		switch status {
		case http.StatusBadRequest:
			accepted++
		case http.StatusUnauthorized:
			rejected++
		default:
			t.Fatalf("unexpected status %d", status)
		}
	}
	require.Equal(t, requestCount/2, accepted)
	require.Equal(t, requestCount/2, rejected)
}

func TestIsLoopbackSetupRequest(t *testing.T) {
	for _, testCase := range []struct {
		remoteAddr string
		want       bool
	}{
		{remoteAddr: "127.0.0.1:8080", want: true},
		{remoteAddr: "[::1]:8080", want: true},
		{remoteAddr: "::1", want: true},
		{remoteAddr: "192.0.2.10:8080", want: false},
		{remoteAddr: "localhost:8080", want: false},
		{remoteAddr: "", want: false},
	} {
		request := httptest.NewRequest(http.MethodGet, "/setup/status", nil)
		request.RemoteAddr = testCase.remoteAddr
		require.Equal(t, testCase.want, isLoopbackSetupRequest(request), testCase.remoteAddr)
	}
}

func performSetupRequest(router http.Handler, path, remoteAddr, token string) *httptest.ResponseRecorder {
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, path, strings.NewReader(`{}`))
	request.Header.Set("Content-Type", "application/json")
	if token != "" {
		request.Header.Set(SetupTokenHeader, token)
	}
	request.RemoteAddr = remoteAddr
	router.ServeHTTP(recorder, request)
	return recorder
}

func netSplitHostPortForTest(address string) (string, string, error) {
	// Kept local to the test file so production code only exports the security API.
	return net.SplitHostPort(address)
}
