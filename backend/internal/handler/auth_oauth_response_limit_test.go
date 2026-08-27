package handler

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestReadOAuthHandlerResponseBodyEnforcesStatusSpecificLimits(t *testing.T) {
	tests := []struct {
		name       string
		statusCode int
		size       int64
		wantErr    bool
		wantLimit  int64
	}{
		{
			name:       "success allows exact json limit",
			statusCode: http.StatusOK,
			size:       oauthHandlerSuccessResponseMaxBytes,
			wantLimit:  oauthHandlerSuccessResponseMaxBytes,
		},
		{
			name:       "success rejects one byte over json limit",
			statusCode: http.StatusOK,
			size:       oauthHandlerSuccessResponseMaxBytes + 1,
			wantErr:    true,
			wantLimit:  oauthHandlerSuccessResponseMaxBytes,
		},
		{
			name:       "error allows exact diagnostic limit",
			statusCode: http.StatusBadGateway,
			size:       oauthHandlerErrorResponseMaxBytes,
			wantLimit:  oauthHandlerErrorResponseMaxBytes,
		},
		{
			name:       "error rejects one byte over diagnostic limit",
			statusCode: http.StatusBadGateway,
			size:       oauthHandlerErrorResponseMaxBytes + 1,
			wantErr:    true,
			wantLimit:  oauthHandlerErrorResponseMaxBytes,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp := &http.Response{
				StatusCode: tt.statusCode,
				Body:       io.NopCloser(strings.NewReader(strings.Repeat("x", int(tt.size)))),
			}

			body, err := readOAuthHandlerResponseBody(resp, "test oauth")
			if tt.wantErr {
				require.Error(t, err)
				require.ErrorIs(t, err, errOAuthHandlerResponseTooLarge)
				require.Nil(t, body, "oversized responses must not return a partial body")
				require.Contains(t, err.Error(), "test oauth response exceeded")
				require.Contains(t, err.Error(), strconv.FormatInt(tt.wantLimit, 10))
				return
			}

			require.NoError(t, err)
			require.Len(t, body, int(tt.size))
		})
	}
}

func TestDingTalkClientRejectsOversizedSuccessfulJSONResponses(t *testing.T) {
	oversizedBody := strings.Repeat("x", int(oauthHandlerSuccessResponseMaxBytes+1))
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = io.WriteString(w, oversizedBody)
	}))
	defer server.Close()

	tests := []struct {
		name      string
		operation string
		call      func(*DingTalkClient) error
	}{
		{
			name:      "user token",
			operation: "dingtalk user token",
			call: func(client *DingTalkClient) error {
				_, err := client.ExchangeCodeForUserToken(context.Background(), "code")
				return err
			},
		},
		{
			name:      "userinfo",
			operation: "dingtalk userinfo",
			call: func(client *DingTalkClient) error {
				_, _, err := client.GetUnionIdByUserToken(context.Background(), "token")
				return err
			},
		},
		{
			name:      "app token",
			operation: "dingtalk app token",
			call: func(client *DingTalkClient) error {
				client.appToken = ""
				_, err := client.GetAppToken(context.Background())
				return err
			},
		},
		{
			name:      "union lookup",
			operation: "dingtalk union lookup",
			call: func(client *DingTalkClient) error {
				_, err := client.GetUserIdByUnionId(context.Background(), "union")
				return err
			},
		},
		{
			name:      "department",
			operation: "dingtalk department",
			call: func(client *DingTalkClient) error {
				_, err := client.GetDeptInfo(context.Background(), 42)
				return err
			},
		},
		{
			name:      "staff",
			operation: "dingtalk staff",
			call: func(client *DingTalkClient) error {
				_, err := client.GetStaffInfoByUserId(context.Background(), "user")
				return err
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := &DingTalkClient{
				cfg: dingTalkClientConfig{
					ClientID:     "client",
					ClientSecret: "secret",
					TokenURL:     server.URL + "/oauth2/userAccessToken",
					UserInfoURL:  server.URL + "/stub",
				},
				httpClient:  server.Client(),
				appToken:    "cached-app-token",
				appTokenExp: time.Now().Add(time.Hour),
			}

			err := tt.call(client)
			require.Error(t, err)
			require.ErrorIs(t, err, errOAuthHandlerResponseTooLarge)
			require.Contains(t, err.Error(), tt.operation+" response exceeded")
		})
	}
}

func TestDingTalkClientRejectsOversizedErrorBodyWithoutEchoingIt(t *testing.T) {
	secretMarker := "provider-secret-error-body"
	body := strings.Repeat(secretMarker, int(oauthHandlerErrorResponseMaxBytes/int64(len(secretMarker)))+2)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusBadGateway)
		_, _ = io.WriteString(w, body)
	}))
	defer server.Close()

	client := &DingTalkClient{
		cfg: dingTalkClientConfig{
			ClientID:     "client",
			ClientSecret: "secret",
			TokenURL:     server.URL,
		},
		httpClient: server.Client(),
	}

	_, err := client.ExchangeCodeForUserToken(context.Background(), "code")
	require.Error(t, err)
	require.ErrorIs(t, err, errOAuthHandlerResponseTooLarge)
	require.Contains(t, err.Error(), "262144-byte limit")
	require.NotContains(t, err.Error(), secretMarker)
}

func TestWeChatOAuthRejectsOversizedResponses(t *testing.T) {
	originalAccessTokenURL := wechatOAuthAccessTokenURL
	originalUserInfoURL := wechatOAuthUserInfoURL
	t.Cleanup(func() {
		wechatOAuthAccessTokenURL = originalAccessTokenURL
		wechatOAuthUserInfoURL = originalUserInfoURL
	})

	t.Run("access token success response", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusOK)
			_, _ = io.WriteString(w, strings.Repeat("x", int(oauthHandlerSuccessResponseMaxBytes+1)))
		}))
		defer server.Close()
		wechatOAuthAccessTokenURL = server.URL

		_, err := exchangeWeChatOAuthCode(context.Background(), wechatOAuthConfig{appID: "app", appSecret: "secret"}, "code")
		require.Error(t, err)
		require.ErrorIs(t, err, errOAuthHandlerResponseTooLarge)
		require.Contains(t, err.Error(), "wechat access token response exceeded 1048576-byte limit")
	})

	t.Run("userinfo success response", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusOK)
			_, _ = io.WriteString(w, strings.Repeat("x", int(oauthHandlerSuccessResponseMaxBytes+1)))
		}))
		defer server.Close()
		wechatOAuthUserInfoURL = server.URL

		_, err := fetchWeChatUserInfo(context.Background(), &wechatOAuthTokenResponse{
			AccessToken: "access",
			OpenID:      "openid",
		})
		require.Error(t, err)
		require.ErrorIs(t, err, errOAuthHandlerResponseTooLarge)
		require.Contains(t, err.Error(), "wechat userinfo response exceeded 1048576-byte limit")
	})

	t.Run("access token error response", func(t *testing.T) {
		secretMarker := "wechat-sensitive-provider-body"
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusBadGateway)
			_, _ = io.WriteString(w, strings.Repeat(secretMarker, int(oauthHandlerErrorResponseMaxBytes/int64(len(secretMarker)))+2))
		}))
		defer server.Close()
		wechatOAuthAccessTokenURL = server.URL

		_, err := exchangeWeChatOAuthCode(context.Background(), wechatOAuthConfig{appID: "app", appSecret: "secret"}, "code")
		require.Error(t, err)
		require.ErrorIs(t, err, errOAuthHandlerResponseTooLarge)
		require.Contains(t, err.Error(), "wechat access token response exceeded 262144-byte limit")
		require.NotContains(t, err.Error(), secretMarker)
	})
}
