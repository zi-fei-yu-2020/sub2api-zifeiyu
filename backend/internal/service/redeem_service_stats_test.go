package service

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/require"
)

type redeemStatsRepositoryStub struct {
	RedeemCodeRepository
	stats *RedeemCodeStats
	err   error
}

func (s *redeemStatsRepositoryStub) GetStats(context.Context) (*RedeemCodeStats, error) {
	return s.stats, s.err
}

func TestRedeemServiceGetStats(t *testing.T) {
	want := &RedeemCodeStats{
		TotalCodes:            12,
		ActiveCodes:           2,
		UsedCodes:             7,
		ExpiredCodes:          2,
		TotalValueDistributed: 28,
		ByType: RedeemCodeStatsByType{
			Balance:      5,
			Concurrency:  3,
			Subscription: 2,
			Invitation:   2,
		},
		DistributedByType: RedeemCodeDistributedByType{
			BalanceValue:     28,
			ConcurrencyUnits: 4,
			SubscriptionDays: 30,
			InvitationCodes:  1,
		},
	}
	repo := &redeemStatsRepositoryStub{stats: want}
	svc := NewRedeemService(repo, nil, nil, nil, nil, nil, nil, nil)

	got, err := svc.GetStats(context.Background())
	require.NoError(t, err)
	require.Equal(t, want, got)
}

func TestRedeemServiceGetStatsWrapsRepositoryError(t *testing.T) {
	repoErr := errors.New("database unavailable")
	repo := &redeemStatsRepositoryStub{err: repoErr}
	svc := NewRedeemService(repo, nil, nil, nil, nil, nil, nil, nil)

	_, err := svc.GetStats(context.Background())
	require.ErrorIs(t, err, repoErr)
	require.ErrorContains(t, err, "get redeem code stats")
}

func TestRedeemServiceGetStatsRejectsRepositoryWithoutCapability(t *testing.T) {
	repo := &struct{ RedeemCodeRepository }{}
	svc := NewRedeemService(repo, nil, nil, nil, nil, nil, nil, nil)

	_, err := svc.GetStats(context.Background())
	require.EqualError(t, err, "redeem code repository does not support statistics")
}
