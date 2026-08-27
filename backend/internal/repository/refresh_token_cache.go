package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/redis/go-redis/v9"
)

const (
	refreshTokenKeyPrefix         = "refresh_token:"
	consumedRefreshTokenKeyPrefix = "consumed_refresh_token:"
	userRefreshTokensPrefix       = "user_refresh_tokens:"
	tokenFamilyPrefix             = "token_family:"
	consumedRefreshTokenMaxTTL    = 24 * time.Hour
)

var rotateRefreshTokenScript = redis.NewScript(`
local current = redis.call("GET", KEYS[1])
if not current then
  local consumed = redis.call("GET", KEYS[2])
  if consumed then
    return {2, consumed}
  end
  return {0, ""}
end

local old_ttl = redis.call("PTTL", KEYS[1])
if old_ttl == -1 then
  return redis.error_reply("active refresh token is missing a TTL")
end
if old_ttl <= 0 then
  return {0, ""}
end

local token_data = cjson.decode(current)
if tostring(token_data.user_id) ~= ARGV[7] or tostring(token_data.family_id) ~= ARGV[8] then
  return redis.error_reply("refresh token rotation metadata mismatch")
end

local user_set_type = redis.call("TYPE", KEYS[4]).ok
local family_set_type = redis.call("TYPE", KEYS[5]).ok
if user_set_type ~= "none" and user_set_type ~= "set" then
  return redis.error_reply("refresh token user index has an invalid type")
end
if family_set_type ~= "none" and family_set_type ~= "set" then
  return redis.error_reply("refresh token family index has an invalid type")
end

local tombstone_ttl = tonumber(ARGV[6])
if tombstone_ttl <= 0 or tombstone_ttl > old_ttl then
  tombstone_ttl = old_ttl
end

local tombstone = cjson.encode({
  consumed_at_unix_milli = tonumber(ARGV[1]),
  data = token_data
})
redis.call("SET", KEYS[2], tombstone, "PX", tombstone_ttl)
redis.call("DEL", KEYS[1])
redis.call("SET", KEYS[3], ARGV[2], "PX", ARGV[3])
redis.call("SREM", KEYS[4], ARGV[4])
redis.call("SADD", KEYS[4], ARGV[5])
redis.call("SREM", KEYS[5], ARGV[4])
redis.call("SADD", KEYS[5], ARGV[5])

local function extend_ttl(key, requested_ttl)
  local current_ttl = redis.call("PTTL", key)
  if current_ttl < requested_ttl then
    redis.call("PEXPIRE", key, requested_ttl)
  end
end
extend_ttl(KEYS[4], tonumber(ARGV[3]))
extend_ttl(KEYS[5], tonumber(ARGV[3]))
return {1, ""}
`)

type consumedRefreshTokenEnvelope struct {
	ConsumedAtUnixMilli int64                     `json:"consumed_at_unix_milli"`
	Data                *service.RefreshTokenData `json:"data"`
}

// refreshTokenKey generates the Redis key for a refresh token.
func refreshTokenKey(tokenHash string) string {
	return refreshTokenKeyPrefix + tokenHash
}

func consumedRefreshTokenKey(tokenHash string) string {
	return consumedRefreshTokenKeyPrefix + tokenHash
}

// userRefreshTokensKey generates the Redis key for user's token set.
func userRefreshTokensKey(userID int64) string {
	return fmt.Sprintf("%s%d", userRefreshTokensPrefix, userID)
}

// tokenFamilyKey generates the Redis key for token family set.
func tokenFamilyKey(familyID string) string {
	return tokenFamilyPrefix + familyID
}

type refreshTokenCache struct {
	rdb *redis.Client
}

// NewRefreshTokenCache creates a new RefreshTokenCache implementation.
func NewRefreshTokenCache(rdb *redis.Client) service.RefreshTokenCache {
	return &refreshTokenCache{rdb: rdb}
}

func (c *refreshTokenCache) StoreRefreshToken(ctx context.Context, tokenHash string, data *service.RefreshTokenData, ttl time.Duration) error {
	key := refreshTokenKey(tokenHash)
	val, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("marshal refresh token data: %w", err)
	}
	return c.rdb.Set(ctx, key, val, ttl).Err()
}

func (c *refreshTokenCache) GetRefreshToken(ctx context.Context, tokenHash string) (*service.RefreshTokenData, error) {
	key := refreshTokenKey(tokenHash)
	val, err := c.rdb.Get(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return nil, service.ErrRefreshTokenNotFound
		}
		return nil, err
	}
	var data service.RefreshTokenData
	if err := json.Unmarshal([]byte(val), &data); err != nil {
		return nil, fmt.Errorf("unmarshal refresh token data: %w", err)
	}
	return &data, nil
}

func (c *refreshTokenCache) GetConsumedRefreshToken(ctx context.Context, tokenHash string) (*service.ConsumedRefreshTokenData, error) {
	value, err := c.rdb.Get(ctx, consumedRefreshTokenKey(tokenHash)).Result()
	if err != nil {
		if err == redis.Nil {
			return nil, service.ErrRefreshTokenNotFound
		}
		return nil, err
	}
	return decodeConsumedRefreshToken(value)
}

func (c *refreshTokenCache) RotateRefreshToken(
	ctx context.Context,
	oldTokenHash string,
	newTokenHash string,
	newData *service.RefreshTokenData,
	newTTL time.Duration,
	consumedAt time.Time,
) (*service.RefreshTokenRotationResult, error) {
	if newData == nil {
		return nil, fmt.Errorf("new refresh token data is required")
	}
	if newTTL <= 0 {
		return nil, fmt.Errorf("new refresh token ttl must be positive")
	}
	if oldTokenHash == "" || newTokenHash == "" || oldTokenHash == newTokenHash {
		return nil, fmt.Errorf("refresh token rotation hashes are invalid")
	}
	if newData.UserID <= 0 || newData.FamilyID == "" {
		return nil, fmt.Errorf("new refresh token metadata is incomplete")
	}
	if consumedAt.IsZero() {
		consumedAt = time.Now()
	}
	encoded, err := json.Marshal(newData)
	if err != nil {
		return nil, fmt.Errorf("marshal new refresh token data: %w", err)
	}
	values, err := rotateRefreshTokenScript.Run(ctx, c.rdb, []string{
		refreshTokenKey(oldTokenHash),
		consumedRefreshTokenKey(oldTokenHash),
		refreshTokenKey(newTokenHash),
		userRefreshTokensKey(newData.UserID),
		tokenFamilyKey(newData.FamilyID),
	},
		consumedAt.UnixMilli(),
		string(encoded),
		newTTL.Milliseconds(),
		oldTokenHash,
		newTokenHash,
		consumedRefreshTokenMaxTTL.Milliseconds(),
		strconv.FormatInt(newData.UserID, 10),
		newData.FamilyID,
	).Slice()
	if err != nil {
		return nil, err
	}
	if len(values) < 2 {
		return nil, fmt.Errorf("refresh token rotation script returned %d values", len(values))
	}
	code, err := refreshTokenRotationCode(values[0])
	if err != nil {
		return nil, err
	}
	switch code {
	case int64(service.RefreshTokenRotationSucceeded):
		return &service.RefreshTokenRotationResult{Status: service.RefreshTokenRotationSucceeded}, nil
	case int64(service.RefreshTokenRotationReused):
		consumed, err := decodeConsumedRefreshToken(redisScriptString(values[1]))
		if err != nil {
			return nil, err
		}
		return &service.RefreshTokenRotationResult{
			Status:   service.RefreshTokenRotationReused,
			Consumed: consumed,
		}, nil
	default:
		return &service.RefreshTokenRotationResult{Status: service.RefreshTokenRotationNotFound}, nil
	}
}

func decodeConsumedRefreshToken(value string) (*service.ConsumedRefreshTokenData, error) {
	var envelope consumedRefreshTokenEnvelope
	if err := json.Unmarshal([]byte(value), &envelope); err != nil {
		return nil, fmt.Errorf("unmarshal consumed refresh token data: %w", err)
	}
	if envelope.Data == nil || envelope.ConsumedAtUnixMilli <= 0 {
		return nil, fmt.Errorf("consumed refresh token data is incomplete")
	}
	return &service.ConsumedRefreshTokenData{
		Data:       envelope.Data,
		ConsumedAt: time.UnixMilli(envelope.ConsumedAtUnixMilli),
	}, nil
}

func refreshTokenRotationCode(value any) (int64, error) {
	switch typed := value.(type) {
	case int64:
		return typed, nil
	case string:
		parsed, err := strconv.ParseInt(typed, 10, 64)
		if err != nil {
			return 0, fmt.Errorf("parse refresh token rotation code: %w", err)
		}
		return parsed, nil
	case []byte:
		parsed, err := strconv.ParseInt(string(typed), 10, 64)
		if err != nil {
			return 0, fmt.Errorf("parse refresh token rotation code: %w", err)
		}
		return parsed, nil
	default:
		return 0, fmt.Errorf("unexpected refresh token rotation code type %T", value)
	}
}

func redisScriptString(value any) string {
	switch typed := value.(type) {
	case string:
		return typed
	case []byte:
		return string(typed)
	default:
		return fmt.Sprint(value)
	}
}

func (c *refreshTokenCache) DeleteRefreshToken(ctx context.Context, tokenHash string) error {
	key := refreshTokenKey(tokenHash)
	return c.rdb.Del(ctx, key).Err()
}

func (c *refreshTokenCache) DeleteUserRefreshTokens(ctx context.Context, userID int64) error {
	// Get all token hashes for this user
	tokenHashes, err := c.GetUserTokenHashes(ctx, userID)
	if err != nil && err != redis.Nil {
		return fmt.Errorf("get user token hashes: %w", err)
	}

	if len(tokenHashes) == 0 {
		return nil
	}

	// Build keys to delete
	keys := make([]string, 0, len(tokenHashes)+1)
	for _, hash := range tokenHashes {
		keys = append(keys, refreshTokenKey(hash))
	}
	keys = append(keys, userRefreshTokensKey(userID))

	// Delete all keys in a pipeline
	pipe := c.rdb.Pipeline()
	for _, key := range keys {
		pipe.Del(ctx, key)
	}
	_, err = pipe.Exec(ctx)
	return err
}

func (c *refreshTokenCache) DeleteTokenFamily(ctx context.Context, familyID string) error {
	// Get all token hashes in this family
	tokenHashes, err := c.GetFamilyTokenHashes(ctx, familyID)
	if err != nil && err != redis.Nil {
		return fmt.Errorf("get family token hashes: %w", err)
	}

	if len(tokenHashes) == 0 {
		return nil
	}

	// Build keys to delete
	keys := make([]string, 0, len(tokenHashes)+1)
	for _, hash := range tokenHashes {
		keys = append(keys, refreshTokenKey(hash))
	}
	keys = append(keys, tokenFamilyKey(familyID))

	// Delete all keys in a pipeline
	pipe := c.rdb.Pipeline()
	for _, key := range keys {
		pipe.Del(ctx, key)
	}
	_, err = pipe.Exec(ctx)
	return err
}

func (c *refreshTokenCache) AddToUserTokenSet(ctx context.Context, userID int64, tokenHash string, ttl time.Duration) error {
	key := userRefreshTokensKey(userID)
	pipe := c.rdb.Pipeline()
	pipe.SAdd(ctx, key, tokenHash)
	pipe.Expire(ctx, key, ttl)
	_, err := pipe.Exec(ctx)
	return err
}

func (c *refreshTokenCache) AddToFamilyTokenSet(ctx context.Context, familyID string, tokenHash string, ttl time.Duration) error {
	key := tokenFamilyKey(familyID)
	pipe := c.rdb.Pipeline()
	pipe.SAdd(ctx, key, tokenHash)
	pipe.Expire(ctx, key, ttl)
	_, err := pipe.Exec(ctx)
	return err
}

func (c *refreshTokenCache) GetUserTokenHashes(ctx context.Context, userID int64) ([]string, error) {
	key := userRefreshTokensKey(userID)
	return c.rdb.SMembers(ctx, key).Result()
}

func (c *refreshTokenCache) GetFamilyTokenHashes(ctx context.Context, familyID string) ([]string, error) {
	key := tokenFamilyKey(familyID)
	return c.rdb.SMembers(ctx, key).Result()
}

func (c *refreshTokenCache) IsTokenInFamily(ctx context.Context, familyID string, tokenHash string) (bool, error) {
	key := tokenFamilyKey(familyID)
	return c.rdb.SIsMember(ctx, key, tokenHash).Result()
}
