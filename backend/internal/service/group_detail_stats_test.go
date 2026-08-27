package service

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/require"
)

type groupDetailStatsRepositoryStub struct {
	stats   *GroupDetailStats
	err     error
	groupID int64
}

func (s *groupDetailStatsRepositoryStub) GetGroupDetailStats(_ context.Context, groupID int64) (*GroupDetailStats, error) {
	s.groupID = groupID
	return s.stats, s.err
}

func TestGroupDetailStatsServiceReturnsRepositoryAggregate(t *testing.T) {
	expected := &GroupDetailStats{
		TotalAPIKeys:    4,
		ActiveAPIKeys:   2,
		TotalRequests:   10,
		TotalTokens:     900,
		TotalCost:       3.5,
		TotalActualCost: 2.25,
	}
	repo := &groupDetailStatsRepositoryStub{stats: expected}
	svc := NewGroupDetailStatsService(repo)

	stats, err := svc.GetStats(context.Background(), 18)

	require.NoError(t, err)
	require.Same(t, expected, stats)
	require.Equal(t, int64(18), repo.groupID)
}

func TestGroupDetailStatsServicePreservesTypedErrors(t *testing.T) {
	repo := &groupDetailStatsRepositoryStub{err: ErrGroupNotFound}
	svc := NewGroupDetailStatsService(repo)

	stats, err := svc.GetStats(context.Background(), 404)

	require.Nil(t, stats)
	require.ErrorIs(t, err, ErrGroupNotFound)
}

func TestGroupDetailStatsServiceWrapsRepositoryFailure(t *testing.T) {
	queryErr := errors.New("query failed")
	repo := &groupDetailStatsRepositoryStub{err: queryErr}
	svc := NewGroupDetailStatsService(repo)

	stats, err := svc.GetStats(context.Background(), 18)

	require.Nil(t, stats)
	require.ErrorIs(t, err, queryErr)
	require.Contains(t, err.Error(), "get group detail stats")
}
