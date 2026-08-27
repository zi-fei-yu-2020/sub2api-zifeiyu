package repository

import (
	"errors"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestReadRepositoryResponseBody(t *testing.T) {
	body, err := readRepositoryResponseBody(strings.NewReader("okay"), 4)
	require.NoError(t, err)
	require.Equal(t, "okay", string(body))

	body, err = readRepositoryResponseBody(strings.NewReader("toolarge"), 4)
	require.Nil(t, body)
	require.ErrorIs(t, err, errRepositoryResponseBodyTooLarge)
	require.True(t, errors.Is(err, errRepositoryResponseBodyTooLarge))
}
