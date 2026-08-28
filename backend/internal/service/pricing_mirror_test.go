package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/stretchr/testify/require"
)

type pricingMirrorRemoteStub struct {
	pricingBodies map[string][]byte
	pricingErrors map[string]error
	hashBodies    map[string]string
	hashErrors    map[string]error
	pricingCalls  []string
	hashCalls     []string
}

func (s *pricingMirrorRemoteStub) FetchPricingJSON(_ context.Context, rawURL string) ([]byte, error) {
	s.pricingCalls = append(s.pricingCalls, rawURL)
	if err := s.pricingErrors[rawURL]; err != nil {
		return nil, err
	}
	return s.pricingBodies[rawURL], nil
}

func (s *pricingMirrorRemoteStub) FetchHashText(_ context.Context, rawURL string) (string, error) {
	s.hashCalls = append(s.hashCalls, rawURL)
	if err := s.hashErrors[rawURL]; err != nil {
		return "", err
	}
	return s.hashBodies[rawURL], nil
}

func TestPricingServiceFallsBackToMirrorWhenGitHubRawIsUnavailable(t *testing.T) {
	const (
		primaryJSON = "https://raw.githubusercontent.com/example/pricing.json"
		primaryHash = "https://raw.githubusercontent.com/example/pricing.sha256"
		mirrorJSON  = "https://cdn.jsdelivr.net/gh/example/pricing.json"
		mirrorHash  = "https://cdn.jsdelivr.net/gh/example/pricing.sha256"
	)
	body := []byte(`{"mirror-model":{"input_cost_per_token":0.000001,"output_cost_per_token":0.000002,"litellm_provider":"test","mode":"chat"}}`)
	digest := sha256.Sum256(body)
	hashText := hex.EncodeToString(digest[:])
	remote := &pricingMirrorRemoteStub{
		pricingBodies: map[string][]byte{mirrorJSON: body},
		pricingErrors: map[string]error{primaryJSON: errors.New("github raw unavailable")},
		hashBodies:    map[string]string{mirrorHash: hashText},
		hashErrors:    map[string]error{primaryHash: errors.New("github raw unavailable")},
	}
	dataDir := t.TempDir()
	svc := NewPricingService(&config.Config{Pricing: config.PricingConfig{
		RemoteURL:       primaryJSON,
		HashURL:         primaryHash,
		MirrorRemoteURL: mirrorJSON,
		MirrorHashURL:   mirrorHash,
		DataDir:         dataDir,
	}}, remote)

	require.NoError(t, svc.downloadPricingData())
	require.Equal(t, []string{primaryJSON, mirrorJSON}, remote.pricingCalls)
	require.Equal(t, []string{primaryHash, mirrorHash}, remote.hashCalls)
	require.NotNil(t, svc.GetModelPricing("mirror-model"))
	saved, err := os.ReadFile(filepath.Join(dataDir, "model_pricing.json"))
	require.NoError(t, err)
	require.JSONEq(t, string(body), string(saved))
}

func TestPricingServiceRejectsMirrorHashMismatch(t *testing.T) {
	const (
		mirrorJSON = "https://cdn.jsdelivr.net/gh/example/pricing.json"
		mirrorHash = "https://cdn.jsdelivr.net/gh/example/pricing.sha256"
	)
	remote := &pricingMirrorRemoteStub{
		pricingBodies: map[string][]byte{mirrorJSON: []byte(`{"model":{"input_cost_per_token":0.1}}`)},
		hashBodies:    map[string]string{mirrorHash: strings.Repeat("0", 64)},
	}
	svc := NewPricingService(&config.Config{Pricing: config.PricingConfig{
		MirrorRemoteURL: mirrorJSON,
		MirrorHashURL:   mirrorHash,
		DataDir:         t.TempDir(),
	}}, remote)

	err := svc.downloadPricingData()
	require.ErrorContains(t, err, "pricing hash mismatch")
	require.Nil(t, svc.GetModelPricing("model"))
}

func TestPricingServiceRemoteHashFallsBackToMirror(t *testing.T) {
	const (
		primaryHash = "https://raw.githubusercontent.com/example/pricing.sha256"
		mirrorHash  = "https://cdn.jsdelivr.net/gh/example/pricing.sha256"
	)
	remote := &pricingMirrorRemoteStub{
		hashBodies: map[string]string{mirrorHash: " mirror-hash \n"},
		hashErrors: map[string]error{primaryHash: errors.New("primary unavailable")},
	}
	svc := NewPricingService(&config.Config{Pricing: config.PricingConfig{
		RemoteURL:       "https://raw.githubusercontent.com/example/pricing.json",
		HashURL:         primaryHash,
		MirrorRemoteURL: "https://cdn.jsdelivr.net/gh/example/pricing.json",
		MirrorHashURL:   mirrorHash,
	}}, remote)

	hash, err := svc.fetchRemoteHash()
	require.NoError(t, err)
	require.Equal(t, "mirror-hash", hash)
	require.Equal(t, []string{primaryHash, mirrorHash}, remote.hashCalls)
}
