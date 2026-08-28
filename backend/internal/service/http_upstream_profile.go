package service

import (
	"context"
	"net/http"
	"strings"
)

// HTTPUpstreamProfile marks HTTP upstream requests that need provider-specific
// transport policy.
type HTTPUpstreamProfile string

const (
	HTTPUpstreamProfileDefault HTTPUpstreamProfile = ""
	HTTPUpstreamProfileOpenAI  HTTPUpstreamProfile = "openai"
	HTTPUpstreamProfileGrok    HTTPUpstreamProfile = "grok"
)

type httpUpstreamProfileContextKey struct{}
type httpUpstreamDisableRedirectsContextKey struct{}
type httpUpstreamConfiguredHostContextKey struct{}

// WithHTTPUpstreamProfile injects an upstream transport profile into ctx.
func WithHTTPUpstreamProfile(ctx context.Context, profile HTTPUpstreamProfile) context.Context {
	if ctx == nil {
		ctx = context.Background()
	}
	if profile == HTTPUpstreamProfileDefault {
		return ctx
	}
	return context.WithValue(ctx, httpUpstreamProfileContextKey{}, profile)
}

// HTTPUpstreamProfileFromContext resolves the upstream transport profile from ctx.
func HTTPUpstreamProfileFromContext(ctx context.Context) HTTPUpstreamProfile {
	if ctx == nil {
		return HTTPUpstreamProfileDefault
	}
	profile, ok := ctx.Value(httpUpstreamProfileContextKey{}).(HTTPUpstreamProfile)
	if !ok {
		return HTTPUpstreamProfileDefault
	}
	switch profile {
	case HTTPUpstreamProfileOpenAI, HTTPUpstreamProfileGrok:
		return profile
	default:
		return HTTPUpstreamProfileDefault
	}
}

// WithHTTPUpstreamRedirectsDisabled prevents credential-bearing probes from
// following redirects through the shared upstream client.
func WithHTTPUpstreamRedirectsDisabled(ctx context.Context) context.Context {
	if ctx == nil {
		ctx = context.Background()
	}
	return context.WithValue(ctx, httpUpstreamDisableRedirectsContextKey{}, true)
}

func HTTPUpstreamRedirectsDisabled(ctx context.Context) bool {
	return ctx != nil && ctx.Value(httpUpstreamDisableRedirectsContextKey{}) == true
}

// WithHTTPUpstreamConfiguredHost records the initial configured target host.
// Redirect validation keeps this original value, so a redirect cannot grant
// itself permission to a different host.
func WithHTTPUpstreamConfiguredHost(req *http.Request) *http.Request {
	if req == nil || req.URL == nil {
		return req
	}
	if HTTPUpstreamConfiguredHostFromContext(req.Context()) != "" {
		return req
	}
	host := strings.ToLower(strings.TrimSpace(req.URL.Host))
	if host == "" {
		return req
	}
	ctx := context.WithValue(req.Context(), httpUpstreamConfiguredHostContextKey{}, host)
	return req.WithContext(ctx)
}

func HTTPUpstreamConfiguredHostFromContext(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	host, _ := ctx.Value(httpUpstreamConfiguredHostContextKey{}).(string)
	return strings.ToLower(strings.TrimSpace(host))
}
