package admin

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

type groupDetailStatsHandlerRepoStub struct {
	stats   *service.GroupDetailStats
	err     error
	groupID int64
}

func (s *groupDetailStatsHandlerRepoStub) GetGroupDetailStats(_ context.Context, groupID int64) (*service.GroupDetailStats, error) {
	s.groupID = groupID
	return s.stats, s.err
}

func newGroupDetailStatsTestService(stats *service.GroupDetailStats, err error) *service.GroupDetailStatsService {
	return service.NewGroupDetailStatsService(&groupDetailStatsHandlerRepoStub{stats: stats, err: err})
}

func setupGroupDetailStatsRouter(statsService *service.GroupDetailStatsService) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	handler := NewGroupHandler(nil, nil, nil, statsService, nil)
	router.GET("/api/v1/admin/groups/:id/stats", handler.GetStats)
	return router
}

func TestGroupHandlerGetStatsReturnsAllCumulativeFields(t *testing.T) {
	expected := &service.GroupDetailStats{
		TotalAPIKeys:    8,
		ActiveAPIKeys:   6,
		TotalRequests:   1517,
		TotalTokens:     175150000,
		TotalCost:       12730.5,
		TotalActualCost: 11002.25,
	}
	repo := &groupDetailStatsHandlerRepoStub{stats: expected}
	router := setupGroupDetailStatsRouter(service.NewGroupDetailStatsService(repo))

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/admin/groups/42/stats", nil)
	router.ServeHTTP(recorder, request)

	require.Equal(t, http.StatusOK, recorder.Code)
	require.Equal(t, int64(42), repo.groupID)

	var envelope struct {
		Code int                      `json:"code"`
		Data service.GroupDetailStats `json:"data"`
	}
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &envelope))
	require.Zero(t, envelope.Code)
	require.Equal(t, *expected, envelope.Data)
}

func TestGroupHandlerGetStatsReturnsNotFoundForMissingGroup(t *testing.T) {
	router := setupGroupDetailStatsRouter(newGroupDetailStatsTestService(nil, service.ErrGroupNotFound))

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/admin/groups/404/stats", nil)
	router.ServeHTTP(recorder, request)

	require.Equal(t, http.StatusNotFound, recorder.Code)
	require.Contains(t, recorder.Body.String(), `"reason":"GROUP_NOT_FOUND"`)
}

func TestGroupHandlerGetStatsReturnsBadRequestForInvalidID(t *testing.T) {
	router := setupGroupDetailStatsRouter(newGroupDetailStatsTestService(&service.GroupDetailStats{}, nil))

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/admin/groups/not-a-number/stats", nil)
	router.ServeHTTP(recorder, request)

	require.Equal(t, http.StatusBadRequest, recorder.Code)
	require.Contains(t, recorder.Body.String(), "Invalid group ID")
}

func TestGroupHandlerGetStatsDoesNotReturnFakeSuccessOnRepositoryFailure(t *testing.T) {
	router := setupGroupDetailStatsRouter(newGroupDetailStatsTestService(nil, errors.New("database unavailable")))

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/admin/groups/42/stats", nil)
	router.ServeHTTP(recorder, request)

	require.Equal(t, http.StatusInternalServerError, recorder.Code)
	require.NotContains(t, recorder.Body.String(), `"total_requests":0`)
}
