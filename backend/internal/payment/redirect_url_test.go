package payment

import "testing"

func TestNormalizeRedirectURL(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		input   string
		want    string
		wantErr bool
	}{
		{name: "empty", input: "", want: ""},
		{name: "https absolute", input: "https://pay.example.com/checkout?id=1#pay", want: "https://pay.example.com/checkout?id=1#pay"},
		{name: "trim surrounding spaces", input: "  https://pay.example.com/checkout  ", want: "https://pay.example.com/checkout"},
		{name: "same site path", input: "/payment/result?order_id=1", want: "/payment/result?order_id=1"},
		{name: "javascript scheme", input: "javascript:alert(1)", wantErr: true},
		{name: "data scheme", input: "data:text/html,boom", wantErr: true},
		{name: "file scheme", input: "file:///etc/passwd", wantErr: true},
		{name: "blob scheme", input: "blob:https://pay.example.com/id", wantErr: true},
		{name: "http absolute", input: "http://pay.example.com/checkout", wantErr: true},
		{name: "protocol relative", input: "//evil.example/checkout", wantErr: true},
		{name: "relative without leading slash", input: "payment/result", wantErr: true},
		{name: "missing host", input: "https:///checkout", wantErr: true},
		{name: "userinfo", input: "https://trusted.example@evil.example/checkout", wantErr: true},
		{name: "backslash authority confusion", input: `/\\evil.example/checkout`, wantErr: true},
		{name: "raw crlf", input: "https://pay.example.com/checkout\r\nX-Test: yes", wantErr: true},
		{name: "encoded crlf", input: "https://pay.example.com/checkout%0d%0aX-Test", wantErr: true},
		{name: "double encoded crlf", input: "https://pay.example.com/checkout%250aX-Test", wantErr: true},
		{name: "invalid escape", input: "https://pay.example.com/%zz", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got, err := NormalizeRedirectURL(tt.input)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("NormalizeRedirectURL(%q) error = nil, want error", tt.input)
				}
				return
			}
			if err != nil {
				t.Fatalf("NormalizeRedirectURL(%q) error = %v", tt.input, err)
			}
			if got != tt.want {
				t.Fatalf("NormalizeRedirectURL(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestNormalizeQRCodeContentKeepsDedicatedSchemes(t *testing.T) {
	t.Parallel()

	for _, input := range []string{
		"weixin://wxpay/bizpayurl?pr=test",
		"alipays://platformapi/startapp?saId=10000007",
		"wxp://opaque-payment-token",
		"provider-specific-token",
	} {
		if got := NormalizeQRCodeContent(input); got != input {
			t.Fatalf("NormalizeQRCodeContent(%q) = %q", input, got)
		}
	}
	if got := NormalizeQRCodeContent("wxp://token\x00"); got != "wxp://token" {
		t.Fatalf("NormalizeQRCodeContent removed value = %q", got)
	}
}
