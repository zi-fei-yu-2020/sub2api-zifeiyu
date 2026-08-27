package repository

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/Wei-Shaw/sub2api/internal/pkg/httpclient"
	"github.com/Wei-Shaw/sub2api/internal/service"
)

const (
	pricingJSONResponseMaxBytes int64 = 32 << 20
	pricingHashResponseMaxBytes int64 = 64 << 10
)

type pricingRemoteClient struct {
	mu                      sync.RWMutex
	httpClient              *http.Client
	proxyURL                string
	allowDirectOnProxyError bool
	initializationError     error
}

// pricingRemoteClientError 代理初始化失败时的错误占位客户端
// 所有请求直接返回初始化错误，禁止回退到直连
type pricingRemoteClientError struct {
	err error
}

func (c *pricingRemoteClientError) FetchPricingJSON(_ context.Context, _ string) ([]byte, error) {
	return nil, c.err
}

func (c *pricingRemoteClientError) FetchHashText(_ context.Context, _ string) (string, error) {
	return "", c.err
}

// NewPricingRemoteClient 创建定价数据远程客户端
// proxyURL 为空时直连，支持 http/https/socks5/socks5h 协议
// 代理配置失败时行为由 allowDirectOnProxyError 控制：
//   - false（默认）：返回错误占位客户端，禁止回退到直连
//   - true：回退到直连（仅限管理员显式开启）
func NewPricingRemoteClient(proxyURL string, allowDirectOnProxyError bool) service.PricingRemoteClient {
	client, err := buildPricingHTTPClient(proxyURL, allowDirectOnProxyError, httpclient.Options{})
	if err != nil {
		return &pricingRemoteClientError{err: err}
	}
	return &pricingRemoteClient{
		httpClient:              client,
		proxyURL:                proxyURL,
		allowDirectOnProxyError: allowDirectOnProxyError,
	}
}

// ConfigureURLPolicy is invoked by PricingService during construction. Keeping
// this optional capability on the client avoids changing the public Wire
// provider signature while ensuring redirects and DNS resolution use the same
// policy as the initial pricing URL validation.
func (c *pricingRemoteClient) ConfigureURLPolicy(policy config.URLAllowlistConfig) {
	if c == nil {
		return
	}
	client, err := buildPricingHTTPClient(c.proxyURL, c.allowDirectOnProxyError, httpclient.Options{
		ValidateResolvedIP: policy.Enabled,
		AllowPrivateHosts:  policy.AllowPrivateHosts,
		AllowedHosts:       policy.PricingHosts,
		RequireAllowlist:   policy.Enabled,
		AllowInsecureHTTP:  policy.AllowInsecureHTTP,
	})
	c.mu.Lock()
	defer c.mu.Unlock()
	c.httpClient = client
	c.initializationError = err
}

func buildPricingHTTPClient(proxyURL string, allowDirectOnProxyError bool, opts httpclient.Options) (*http.Client, error) {
	opts.Timeout = 30 * time.Second
	opts.ProxyURL = proxyURL
	sharedClient, err := httpclient.GetClient(opts)
	if err == nil {
		return sharedClient, nil
	}
	if strings.TrimSpace(proxyURL) != "" && !allowDirectOnProxyError {
		slog.Warn("proxy client init failed, all requests will fail", "service", "pricing", "error", err)
		return nil, fmt.Errorf("proxy client init failed and direct fallback is disabled; set security.proxy_fallback.allow_direct_on_error=true to allow fallback: %w", err)
	}
	opts.ProxyURL = ""
	sharedClient, directErr := httpclient.GetClient(opts)
	if directErr != nil {
		return nil, fmt.Errorf("direct client init failed: %w", directErr)
	}
	return sharedClient, nil
}

func (c *pricingRemoteClient) client() (*http.Client, error) {
	if c == nil {
		return nil, errors.New("pricing remote client is nil")
	}
	c.mu.RLock()
	defer c.mu.RUnlock()
	if c.initializationError != nil {
		return nil, c.initializationError
	}
	if c.httpClient == nil {
		return nil, errors.New("pricing remote client is not initialized")
	}
	return c.httpClient, nil
}

func (c *pricingRemoteClient) FetchPricingJSON(ctx context.Context, url string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}

	client, err := c.client()
	if err != nil {
		return nil, err
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	body, err := readRepositoryResponseBody(resp.Body, pricingJSONResponseMaxBytes)
	if err != nil {
		return nil, fmt.Errorf("read pricing JSON response failed: %w", err)
	}
	return body, nil
}

func (c *pricingRemoteClient) FetchHashText(ctx context.Context, url string) (string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", err
	}

	client, err := c.client()
	if err != nil {
		return "", err
	}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	body, err := readRepositoryResponseBody(resp.Body, pricingHashResponseMaxBytes)
	if err != nil {
		return "", fmt.Errorf("read pricing hash response failed: %w", err)
	}

	// 哈希文件格式：hash  filename 或者纯 hash
	hash := strings.TrimSpace(string(body))
	parts := strings.Fields(hash)
	if len(parts) > 0 {
		return parts[0], nil
	}
	return hash, nil
}
