package urlvalidator

import "testing"

func TestValidateURLFormat(t *testing.T) {
	if _, err := ValidateURLFormat("", false); err == nil {
		t.Fatalf("expected empty url to fail")
	}
	if _, err := ValidateURLFormat("://bad", false); err == nil {
		t.Fatalf("expected invalid url to fail")
	}
	if _, err := ValidateURLFormat("http://example.com", false); err == nil {
		t.Fatalf("expected http to fail when allow_insecure_http is false")
	}
	if _, err := ValidateURLFormat("https://example.com", false); err != nil {
		t.Fatalf("expected https to pass, got %v", err)
	}
	if _, err := ValidateURLFormat("http://example.com", true); err != nil {
		t.Fatalf("expected http to pass when allow_insecure_http is true, got %v", err)
	}
	if _, err := ValidateURLFormat("https://example.com:bad", true); err == nil {
		t.Fatalf("expected invalid port to fail")
	}

	// 验证末尾斜杠被移除
	normalized, err := ValidateURLFormat("https://example.com/", false)
	if err != nil {
		t.Fatalf("expected trailing slash url to pass, got %v", err)
	}
	if normalized != "https://example.com" {
		t.Fatalf("expected trailing slash to be removed, got %s", normalized)
	}

	// 验证多个末尾斜杠被移除
	normalized, err = ValidateURLFormat("https://example.com///", false)
	if err != nil {
		t.Fatalf("expected multiple trailing slashes to pass, got %v", err)
	}
	if normalized != "https://example.com" {
		t.Fatalf("expected all trailing slashes to be removed, got %s", normalized)
	}

	// 验证带路径的 URL 末尾斜杠被移除
	normalized, err = ValidateURLFormat("https://example.com/api/v1/", false)
	if err != nil {
		t.Fatalf("expected trailing slash url with path to pass, got %v", err)
	}
	if normalized != "https://example.com/api/v1" {
		t.Fatalf("expected trailing slash to be removed from path, got %s", normalized)
	}
}

func TestValidateHTTPURL(t *testing.T) {
	if _, err := ValidateHTTPURL("http://example.com", false, ValidationOptions{}); err == nil {
		t.Fatalf("expected http to fail when allow_insecure_http is false")
	}
	if _, err := ValidateHTTPURL("http://example.com", true, ValidationOptions{}); err != nil {
		t.Fatalf("expected http to pass when allow_insecure_http is true, got %v", err)
	}
	if _, err := ValidateHTTPURL("https://example.com", false, ValidationOptions{RequireAllowlist: true}); err == nil {
		t.Fatalf("expected require allowlist to fail when empty")
	}
	if _, err := ValidateHTTPURL("https://example.com", false, ValidationOptions{AllowedHosts: []string{"api.example.com"}}); err == nil {
		t.Fatalf("expected host not in allowlist to fail")
	}
	if _, err := ValidateHTTPURL("https://api.example.com", false, ValidationOptions{AllowedHosts: []string{"api.example.com"}}); err != nil {
		t.Fatalf("expected allowlisted host to pass, got %v", err)
	}
	if _, err := ValidateHTTPURL("https://sub.api.example.com", false, ValidationOptions{AllowedHosts: []string{"*.example.com"}}); err != nil {
		t.Fatalf("expected wildcard allowlist to pass, got %v", err)
	}
	if _, err := ValidateHTTPURL("https://localhost", false, ValidationOptions{AllowPrivate: false}); err == nil {
		t.Fatalf("expected localhost to be blocked when allow_private_hosts is false")
	}
}

func TestValidateHTTPURL_PrivateNetworkRequiresExplicitTarget(t *testing.T) {
	opts := ValidationOptions{
		AllowedHosts:     []string{"192.168.1.20:11434"},
		RequireAllowlist: true,
		AllowPrivate:     true,
	}
	if _, err := ValidateHTTPURL("http://192.168.1.20:11434/v1", true, opts); err != nil {
		t.Fatalf("expected explicitly allowlisted private HTTP target to pass: %v", err)
	}
	if _, err := ValidateHTTPURL("http://192.168.1.20:8080/v1", true, opts); err == nil {
		t.Fatal("expected non-allowlisted port to fail")
	}
	if _, err := ValidateHTTPURL("http://192.168.1.21:11434/v1", true, opts); err == nil {
		t.Fatal("expected non-allowlisted private host to fail")
	}
}

func TestValidateHTTPURL_MetadataAlwaysBlocked(t *testing.T) {
	for _, raw := range []string{
		"http://169.254.169.254/latest/meta-data",
		"http://100.100.100.200/latest/meta-data",
		"http://metadata.google.internal/computeMetadata/v1",
		"http://metadata.tencentyun.com/latest/meta-data",
		"http://[fd00:ec2::254]/latest/meta-data",
	} {
		if _, err := ValidateHTTPURL(raw, true, ValidationOptions{
			AllowedHosts:     []string{"169.254.169.254", "100.100.100.200", "metadata.google.internal", "metadata.tencentyun.com", "fd00:ec2::254"},
			RequireAllowlist: true,
			AllowPrivate:     true,
		}); err == nil {
			t.Fatalf("expected metadata URL %q to fail", raw)
		}
	}
}

func TestValidateResolvedIPWithOptions(t *testing.T) {
	if err := ValidateResolvedIPWithOptions("127.0.0.1", true); err != nil {
		t.Fatalf("expected loopback to pass in private-network mode: %v", err)
	}
	if err := ValidateResolvedIPWithOptions("127.0.0.1", false); err == nil {
		t.Fatal("expected loopback to fail in strict mode")
	}
	if err := ValidateResolvedIPWithOptions("169.254.169.254", true); err == nil {
		t.Fatal("expected metadata IP to fail even in private-network mode")
	}
	if err := ValidateResolvedIPWithOptions("100.100.100.200", true); err == nil {
		t.Fatal("expected Alibaba metadata IP to fail even in private-network mode")
	}
	if err := ValidateResolvedIPWithOptions("fd00:ec2::254", true); err == nil {
		t.Fatal("expected AWS metadata IPv6 to fail even in private-network mode")
	}
}

func TestValidateConfiguredUpstreamURLAllowsPublicCustomHost(t *testing.T) {
	got, err := ValidateConfiguredUpstreamURL("https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode", false, ValidationOptions{
		AllowedHosts: []string{"api.openai.com"},
	})
	if err != nil {
		t.Fatalf("public custom upstream should be allowed: %v", err)
	}
	if got != "https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode" {
		t.Fatalf("normalized URL = %q", got)
	}
}

func TestValidateConfiguredUpstreamURLRejectsPrivateHostInStrictMode(t *testing.T) {
	_, err := ValidateConfiguredUpstreamURL("http://127.0.0.1:11434", true, ValidationOptions{
		AllowedHosts: []string{"127.0.0.1:11434"},
		AllowPrivate: false,
	})
	if err == nil {
		t.Fatal("strict mode must reject private upstreams")
	}
}

func TestValidateConfiguredUpstreamURLAllowsExplicitPrivateHost(t *testing.T) {
	got, err := ValidateConfiguredUpstreamURL("http://127.0.0.1:11434", true, ValidationOptions{
		AllowedHosts: []string{"127.0.0.1:11434"},
		AllowPrivate: true,
	})
	if err != nil {
		t.Fatalf("explicit private upstream should be allowed: %v", err)
	}
	if got != "http://127.0.0.1:11434" {
		t.Fatalf("normalized URL = %q", got)
	}
}
