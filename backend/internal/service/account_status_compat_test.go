package service

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestNormalizeAccountStatus(t *testing.T) {
	require.Equal(t, StatusDisabled, NormalizeAccountStatus("inactive"))
	require.Equal(t, StatusDisabled, NormalizeAccountStatus(" INACTIVE "))
	require.Equal(t, StatusDisabled, NormalizeAccountStatus(StatusDisabled))
	require.Equal(t, StatusActive, NormalizeAccountStatus(StatusActive))
}
