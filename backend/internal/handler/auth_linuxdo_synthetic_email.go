package handler

import (
	"strings"

	"github.com/Wei-Shaw/sub2api/internal/service"
)

// buildLinuxDoOAuthEmail 生成 LinuxDo Connect 用户的合成邮箱。
// 优先使用规范化的小写 username（例如 zifeiyu@ldc.112102.xyz），
// 若 username 为空则回退到 subject（如 linuxdo-12345@ldc.112102.xyz）。
func buildLinuxDoOAuthEmail(username string, subject string) string {
	username = strings.TrimSpace(username)
	subject = strings.TrimSpace(subject)

	var validNameBuilder strings.Builder
	for _, r := range strings.ToLower(username) {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '_' || r == '-' || r == '.' {
			validNameBuilder.WriteRune(r)
		}
	}
	validName := strings.Trim(validNameBuilder.String(), "._-")

	if validName != "" && len(validName) <= 64 {
		return validName + service.LinuxDoConnectSyntheticEmailDomain
	}

	if subject != "" {
		return "linuxdo-" + subject + service.LinuxDoConnectSyntheticEmailDomain
	}
	return ""
}
