package service

import (
	"context"
	"fmt"
)

// GroupDetailStats contains cumulative statistics for one non-deleted group.
type GroupDetailStats struct {
	TotalAPIKeys    int64   `json:"total_api_keys"`
	ActiveAPIKeys   int64   `json:"active_api_keys"`
	TotalRequests   int64   `json:"total_requests"`
	TotalTokens     int64   `json:"total_tokens"`
	TotalCost       float64 `json:"total_cost"`
	TotalActualCost float64 `json:"total_actual_cost"`
}

// GroupDetailStatsRepository provides the dedicated aggregate used by the
// admin group detail endpoint. It deliberately remains separate from the
// dashboard and general usage repositories.
type GroupDetailStatsRepository interface {
	GetGroupDetailStats(ctx context.Context, groupID int64) (*GroupDetailStats, error)
}

// GroupDetailStatsService exposes cumulative group detail statistics.
type GroupDetailStatsService struct {
	repo GroupDetailStatsRepository
}

func NewGroupDetailStatsService(repo GroupDetailStatsRepository) *GroupDetailStatsService {
	return &GroupDetailStatsService{repo: repo}
}

func (s *GroupDetailStatsService) GetStats(ctx context.Context, groupID int64) (*GroupDetailStats, error) {
	stats, err := s.repo.GetGroupDetailStats(ctx, groupID)
	if err != nil {
		return nil, fmt.Errorf("get group detail stats: %w", err)
	}
	return stats, nil
}
