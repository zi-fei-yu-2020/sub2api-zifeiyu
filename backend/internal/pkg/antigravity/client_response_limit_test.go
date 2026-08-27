package antigravity

import (
	"errors"
	"strings"
	"testing"
)

func TestReadAntigravityResponseBody(t *testing.T) {
	body, err := readAntigravityResponseBody(strings.NewReader("okay"), 4)
	if err != nil {
		t.Fatalf("exact-limit response failed: %v", err)
	}
	if string(body) != "okay" {
		t.Fatalf("unexpected body: %q", body)
	}

	body, err = readAntigravityResponseBody(strings.NewReader("toolarge"), 4)
	if body != nil {
		t.Fatalf("oversized body must not be returned: %q", body)
	}
	if !errors.Is(err, errAntigravityResponseTooLarge) {
		t.Fatalf("expected oversized response error, got %v", err)
	}
}
