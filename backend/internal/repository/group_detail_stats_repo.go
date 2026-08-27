package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/Wei-Shaw/sub2api/internal/service"
)

const groupDetailStatsQuery = `
SELECT
	COALESCE(key_stats.total_api_keys, 0) AS total_api_keys,
	COALESCE(key_stats.active_api_keys, 0) AS active_api_keys,
	COALESCE(usage_stats.total_requests, 0) AS total_requests,
	COALESCE(usage_stats.total_tokens, 0) AS total_tokens,
	COALESCE(usage_stats.total_cost, 0) AS total_cost,
	COALESCE(usage_stats.total_actual_cost, 0) AS total_actual_cost
FROM groups g
LEFT JOIN LATERAL (
	SELECT
		COUNT(*) AS total_api_keys,
		COUNT(*) FILTER (WHERE ak.status = 'active') AS active_api_keys
	FROM api_keys ak
	WHERE ak.group_id = g.id
	  AND ak.deleted_at IS NULL
) key_stats ON TRUE
LEFT JOIN LATERAL (
	SELECT
		COUNT(*) AS total_requests,
		COALESCE(SUM(
			ul.input_tokens
			+ ul.output_tokens
			+ ul.cache_creation_tokens
			+ ul.cache_read_tokens
		), 0) AS total_tokens,
		COALESCE(SUM(ul.total_cost), 0) AS total_cost,
		COALESCE(SUM(ul.actual_cost), 0) AS total_actual_cost
	FROM usage_logs ul
	WHERE ul.group_id = g.id
) usage_stats ON TRUE
WHERE g.id = $1
  AND g.deleted_at IS NULL
`

type groupDetailStatsRepository struct {
	sql sqlQueryer
}

func NewGroupDetailStatsRepository(sqlDB *sql.DB) service.GroupDetailStatsRepository {
	return &groupDetailStatsRepository{sql: sqlDB}
}

func (r *groupDetailStatsRepository) GetGroupDetailStats(ctx context.Context, groupID int64) (*service.GroupDetailStats, error) {
	stats := &service.GroupDetailStats{}
	err := scanSingleRow(
		ctx,
		r.sql,
		groupDetailStatsQuery,
		[]any{groupID},
		&stats.TotalAPIKeys,
		&stats.ActiveAPIKeys,
		&stats.TotalRequests,
		&stats.TotalTokens,
		&stats.TotalCost,
		&stats.TotalActualCost,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, service.ErrGroupNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("query group detail stats: %w", err)
	}
	return stats, nil
}
