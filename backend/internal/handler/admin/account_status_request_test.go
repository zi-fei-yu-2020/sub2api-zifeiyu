package admin

import (
	"testing"

	"github.com/gin-gonic/gin/binding"
	"github.com/stretchr/testify/require"
)

func TestAccountStatusRequestAcceptsLegacyAndCanonicalDisabledValues(t *testing.T) {
	for _, status := range []string{"active", "inactive", "disabled", "error"} {
		require.NoError(t, binding.Validator.ValidateStruct(&UpdateAccountRequest{Status: status}), status)
		require.NoError(t, binding.Validator.ValidateStruct(&BulkUpdateAccountsRequest{Status: status}), status)
	}
	require.Error(t, binding.Validator.ValidateStruct(&UpdateAccountRequest{Status: "paused"}))
}
