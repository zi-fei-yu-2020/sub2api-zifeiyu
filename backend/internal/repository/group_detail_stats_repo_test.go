package repository

import (
	"context"
	"database/sql"
	"errors"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/stretchr/testify/require"
)

const groupDetailStatsQueryPattern = `(?s)SELECT.*FROM groups g.*WHERE g.id = \$1.*g.deleted_at IS NULL`

func TestGroupDetailStatsRepositoryReturnsCumulativeAggregates(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	t.Cleanup(func() { _ = db.Close() })

	mock.ExpectQuery(groupDetailStatsQueryPattern).
		WithArgs(int64(42)).
		WillReturnRows(sqlmock.NewRows([]string{
			"total_api_keys",
			"active_api_keys",
			"total_requests",
			"total_tokens",
			"total_cost",
			"total_actual_cost",
		}).AddRow(int64(5), int64(3), int64(17), int64(12345), 19.75, 11.25))

	repo := NewGroupDetailStatsRepository(db)
	stats, err := repo.GetGroupDetailStats(context.Background(), 42)

	require.NoError(t, err)
	require.Equal(t, &service.GroupDetailStats{
		TotalAPIKeys:    5,
		ActiveAPIKeys:   3,
		TotalRequests:   17,
		TotalTokens:     12345,
		TotalCost:       19.75,
		TotalActualCost: 11.25,
	}, stats)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestGroupDetailStatsRepositoryReturnsZerosWhenGroupHasNoData(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	t.Cleanup(func() { _ = db.Close() })

	mock.ExpectQuery(groupDetailStatsQueryPattern).
		WithArgs(int64(7)).
		WillReturnRows(sqlmock.NewRows([]string{
			"total_api_keys",
			"active_api_keys",
			"total_requests",
			"total_tokens",
			"total_cost",
			"total_actual_cost",
		}).AddRow(int64(0), int64(0), int64(0), int64(0), 0.0, 0.0))

	repo := NewGroupDetailStatsRepository(db)
	stats, err := repo.GetGroupDetailStats(context.Background(), 7)

	require.NoError(t, err)
	require.Equal(t, &service.GroupDetailStats{}, stats)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestGroupDetailStatsRepositoryRejectsMissingOrSoftDeletedGroup(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	t.Cleanup(func() { _ = db.Close() })

	mock.ExpectQuery(groupDetailStatsQueryPattern).
		WithArgs(int64(99)).
		WillReturnRows(sqlmock.NewRows([]string{
			"total_api_keys",
			"active_api_keys",
			"total_requests",
			"total_tokens",
			"total_cost",
			"total_actual_cost",
		}))

	repo := NewGroupDetailStatsRepository(db)
	stats, err := repo.GetGroupDetailStats(context.Background(), 99)

	require.Nil(t, stats)
	require.ErrorIs(t, err, service.ErrGroupNotFound)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestGroupDetailStatsRepositoryPropagatesQueryFailure(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	t.Cleanup(func() { _ = db.Close() })

	queryErr := errors.New("database unavailable")
	mock.ExpectQuery(groupDetailStatsQueryPattern).
		WithArgs(int64(42)).
		WillReturnError(queryErr)

	repo := NewGroupDetailStatsRepository(db)
	stats, err := repo.GetGroupDetailStats(context.Background(), 42)

	require.Nil(t, stats)
	require.ErrorIs(t, err, queryErr)
	require.False(t, errors.Is(err, sql.ErrNoRows))
	require.NoError(t, mock.ExpectationsWereMet())
}
