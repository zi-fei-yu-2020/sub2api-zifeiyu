//go:build unit

package service

import (
	"context"
	"errors"
	"testing"
	"time"

	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
	"github.com/Wei-Shaw/sub2api/internal/pkg/timezone"
	"github.com/Wei-Shaw/sub2api/internal/pkg/usagestats"
	"github.com/stretchr/testify/require"
)

type adminUserUsageUserRepoStub struct {
	UserRepository
	user *User
	err  error
}

func (s *adminUserUsageUserRepoStub) GetByID(context.Context, int64) (*User, error) {
	return s.user, s.err
}

type adminUserUsageRepoStub struct {
	filters usagestats.UsageLogFilters
	stats   *usagestats.UsageStats
	err     error
	calls   int
}

func (s *adminUserUsageRepoStub) GetStatsWithFilters(_ context.Context, filters usagestats.UsageLogFilters) (*usagestats.UsageStats, error) {
	s.calls++
	s.filters = filters
	return s.stats, s.err
}

func TestResolveAdminUserUsagePeriod(t *testing.T) {
	now := time.Date(2026, time.August, 27, 15, 30, 0, 0, timezone.Location())

	tests := []struct {
		period    string
		want      string
		wantStart *time.Time
	}{
		{period: "today", want: "today", wantStart: timePointer(timezone.StartOfDay(now))},
		{period: "week", want: "week", wantStart: timePointer(timezone.StartOfWeek(now))},
		{period: "month", want: "month", wantStart: timePointer(timezone.StartOfMonth(now))},
		{period: "all", want: "all", wantStart: nil},
		{period: "", want: "month", wantStart: timePointer(timezone.StartOfMonth(now))},
		{period: " WEEK ", want: "week", wantStart: timePointer(timezone.StartOfWeek(now))},
	}

	for _, tc := range tests {
		t.Run(tc.period, func(t *testing.T) {
			period, start, end, err := resolveAdminUserUsagePeriod(tc.period, now)
			require.NoError(t, err)
			require.Equal(t, tc.want, period)
			require.Equal(t, tc.wantStart, start)
			require.Equal(t, now, end)
		})
	}

	_, _, _, err := resolveAdminUserUsagePeriod("year", now)
	require.Error(t, err)
	require.Equal(t, "INVALID_USAGE_PERIOD", infraerrors.Reason(err))
}

func TestAdminServiceGetUserUsageStatsReturnsRealAggregate(t *testing.T) {
	repo := &adminUserUsageRepoStub{stats: &usagestats.UsageStats{
		TotalRequests:            12,
		TotalInputTokens:         100,
		TotalOutputTokens:        50,
		TotalCacheCreationTokens: 20,
		TotalCacheReadTokens:     10,
		TotalCacheTokens:         30,
		TotalTokens:              180,
		TotalCost:                2.5,
		TotalActualCost:          1.75,
		AverageDurationMs:        425.5,
	}}
	svc := &adminServiceImpl{
		userRepo:           &adminUserUsageUserRepoStub{user: &User{ID: 42}},
		adminUserUsageRepo: repo,
	}

	got, err := svc.GetUserUsageStats(context.Background(), 42, "all")
	require.NoError(t, err)
	require.Equal(t, int64(42), got.UserID)
	require.Equal(t, "all", got.Period)
	require.Nil(t, got.StartTime)
	require.NotZero(t, got.EndTime)
	require.Equal(t, int64(12), got.TotalRequests)
	require.Equal(t, int64(180), got.TotalTokens)
	require.Equal(t, 2.5, got.TotalCost)
	require.Equal(t, 1.75, got.TotalActualCost)
	require.Equal(t, 425.5, got.AverageDurationMs)
	require.Equal(t, int64(42), repo.filters.UserID)
	require.Nil(t, repo.filters.StartTime)
	require.NotNil(t, repo.filters.EndTime)
}

func TestAdminServiceGetUserUsageStatsRejectsInvalidPeriodBeforeQuery(t *testing.T) {
	repo := &adminUserUsageRepoStub{stats: &usagestats.UsageStats{}}
	svc := &adminServiceImpl{
		userRepo:           &adminUserUsageUserRepoStub{user: &User{ID: 42}},
		adminUserUsageRepo: repo,
	}

	_, err := svc.GetUserUsageStats(context.Background(), 42, "quarter")
	require.Error(t, err)
	require.Equal(t, "INVALID_USAGE_PERIOD", infraerrors.Reason(err))
	require.Zero(t, repo.calls)
}

func TestAdminServiceGetUserUsageStatsPropagatesLookupAndAggregateErrors(t *testing.T) {
	lookupErr := errors.New("lookup failed")
	svc := &adminServiceImpl{
		userRepo:           &adminUserUsageUserRepoStub{err: lookupErr},
		adminUserUsageRepo: &adminUserUsageRepoStub{stats: &usagestats.UsageStats{}},
	}
	_, err := svc.GetUserUsageStats(context.Background(), 42, "today")
	require.ErrorIs(t, err, lookupErr)

	aggregateErr := errors.New("aggregate failed")
	svc = &adminServiceImpl{
		userRepo:           &adminUserUsageUserRepoStub{user: &User{ID: 42}},
		adminUserUsageRepo: &adminUserUsageRepoStub{err: aggregateErr},
	}
	_, err = svc.GetUserUsageStats(context.Background(), 42, "today")
	require.ErrorIs(t, err, aggregateErr)
}

func TestAdminServiceGetUserUsageStatsFailsWhenAggregateUnavailable(t *testing.T) {
	svc := &adminServiceImpl{userRepo: &adminUserUsageUserRepoStub{user: &User{ID: 42}}}
	_, err := svc.GetUserUsageStats(context.Background(), 42, "today")
	require.Error(t, err)
	require.Equal(t, "USER_USAGE_STATS_UNAVAILABLE", infraerrors.Reason(err))
}

func timePointer(value time.Time) *time.Time {
	return &value
}
