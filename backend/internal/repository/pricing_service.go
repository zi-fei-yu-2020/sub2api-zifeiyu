package repository

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/Wei-Shaw/sub2api/internal/pkg/httpclient"
	"github.com/Wei-Shaw/sub2api/internal/service"
)

type pricingRemoteClient struct {
	httpClient *http.Client
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
	return newPricingRemoteClient(proxyURL, allowDirectOnProxyError, httpclient.Options{})
}

func NewPricingRemoteClientWithURLPolicy(proxyURL string, allowDirectOnProxyError bool, policy config.URLAllowlistConfig) service.PricingRemoteClient {
	return newPricingRemoteClient(proxyURL, allowDirectOnProxyError, httpclient.Options{
		ValidateResolvedIP: policy.Enabled,
		AllowPrivateHosts:  policy.AllowPrivateHosts,
		AllowedHosts:       policy.PricingHosts,
		RequireAllowlist:   policy.Enabled,
		AllowInsecureHTTP:  policy.AllowInsecureHTTP,
	})
}

func newPricingRemoteClient(proxyURL string, allowDirectOnProxyError bool, opts httpclient.Options) service.PricingRemoteClient {
	// httpclient.GetClient errors do not include plaintext proxy credentials.
	// Initialization failures are logged server-side and are not exposed as HTTP responses.
	opts.Timeout = 30 * time.Second
	opts.ProxyURL = proxyURL
	sharedClient, err := httpclient.GetClient(opts)
	if err != nil {
		if strings.TrimSpace(proxyURL) != "" && !allowDirectOnProxyError {
			slog.Warn("proxy client init failed, all requests will fail", "service", "pricing", "error", err)
			return &pricingRemoteClientError{err: fmt.Errorf("proxy client init failed and direct fallback is disabled; set security.proxy_fallback.allow_direct_on_error=true to allow fallback: %w", err)}
		}
		opts.ProxyURL = ""
		sharedClient, err = httpclient.GetClient(opts)
		if err != nil {
			return &pricingRemoteClientError{err: fmt.Errorf("direct client init failed: %w", err)}
		}
	}
	return &pricingRemoteClient{
		httpClient: sharedClient,
	}
}

func (c *pricingRemoteClient) FetchPricingJSON(ctx context.Context, url string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	return io.ReadAll(resp.Body)
}

func (c *pricingRemoteClient) FetchHashText(ctx context.Context, url string) (string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	// 哈希文件格式：hash  filename 或者纯 hash
	hash := strings.TrimSpace(string(body))
	parts := strings.Fields(hash)
	if len(parts) > 0 {
		return parts[0], nil
	}
	return hash, nil
}
