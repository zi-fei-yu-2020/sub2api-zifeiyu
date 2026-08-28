package repository

import (
	"context"
	"strings"
	"time"

	dbent "github.com/Wei-Shaw/sub2api/ent"
	"github.com/Wei-Shaw/sub2api/ent/redeemcode"
	"github.com/Wei-Shaw/sub2api/ent/user"
	"github.com/Wei-Shaw/sub2api/internal/pkg/pagination"
	"github.com/Wei-Shaw/sub2api/internal/service"

	entsql "entgo.io/ent/dialect/sql"
)

type redeemCodeRepository struct {
	client *dbent.Client
}

func NewRedeemCodeRepository(client *dbent.Client) service.RedeemCodeRepository {
	return &redeemCodeRepository{client: client}
}

func (r *redeemCodeRepository) Create(ctx context.Context, code *service.RedeemCode) error {
	created, err := r.client.RedeemCode.Create().
		SetCode(code.Code).
		SetType(code.Type).
		SetValue(code.Value).
		SetStatus(code.Status).
		SetNotes(code.Notes).
		SetValidityDays(code.ValidityDays).
		SetNillableExpiresAt(code.ExpiresAt).
		SetNillableUsedBy(code.UsedBy).
		SetNillableUsedAt(code.UsedAt).
		SetNillableGroupID(code.GroupID).
		Save(ctx)
	if err == nil {
		code.ID = created.ID
		code.CreatedAt = created.CreatedAt
	}
	return err
}

func (r *redeemCodeRepository) CreateBatch(ctx context.Context, codes []service.RedeemCode) error {
	if len(codes) == 0 {
		return nil
	}

	builders := make([]*dbent.RedeemCodeCreate, 0, len(codes))
	for i := range codes {
		c := &codes[i]
		b := r.client.RedeemCode.Create().
			SetCode(c.Code).
			SetType(c.Type).
			SetValue(c.Value).
			SetStatus(c.Status).
			SetNotes(c.Notes).
			SetValidityDays(c.ValidityDays).
			SetNillableExpiresAt(c.ExpiresAt).
			SetNillableUsedBy(c.UsedBy).
			SetNillableUsedAt(c.UsedAt).
			SetNillableGroupID(c.GroupID)
		builders = append(builders, b)
	}

	return r.client.RedeemCode.CreateBulk(builders...).Exec(ctx)
}

func (r *redeemCodeRepository) GetByID(ctx context.Context, id int64) (*service.RedeemCode, error) {
	m, err := r.client.RedeemCode.Query().
		Where(redeemcode.IDEQ(id)).
		Only(ctx)
	if err != nil {
		if dbent.IsNotFound(err) {
			return nil, service.ErrRedeemCodeNotFound
		}
		return nil, err
	}
	return redeemCodeEntityToService(m), nil
}

func (r *redeemCodeRepository) GetByCode(ctx context.Context, code string) (*service.RedeemCode, error) {
	m, err := r.client.RedeemCode.Query().
		Where(redeemcode.CodeEQ(code)).
		Only(ctx)
	if err != nil {
		if dbent.IsNotFound(err) {
			return nil, service.ErrRedeemCodeNotFound
		}
		return nil, err
	}
	return redeemCodeEntityToService(m), nil
}

func (r *redeemCodeRepository) Delete(ctx context.Context, id int64) error {
	_, err := r.client.RedeemCode.Delete().Where(redeemcode.IDEQ(id)).Exec(ctx)
	return err
}

type redeemCodeStatsRow struct {
	TotalCodes          int64   `json:"total_codes"`
	ActiveCodes         int64   `json:"active_codes"`
	UsedCodes           int64   `json:"used_codes"`
	ExpiredCodes        int64   `json:"expired_codes"`
	BalanceCodes        int64   `json:"balance_codes"`
	ConcurrencyCodes    int64   `json:"concurrency_codes"`
	SubscriptionCodes   int64   `json:"subscription_codes"`
	InvitationCodes     int64   `json:"invitation_codes"`
	BalanceValue        float64 `json:"balance_value"`
	ConcurrencyUnits    float64 `json:"concurrency_units"`
	SubscriptionDays    int64   `json:"subscription_days"`
	UsedInvitationCodes int64   `json:"used_invitation_codes"`
}

// GetStats aggregates redeem-code reporting in the database. CURRENT_TIMESTAMP
// is evaluated consistently by PostgreSQL for the whole statement.
func (r *redeemCodeRepository) GetStats(ctx context.Context) (*service.RedeemCodeStats, error) {
	statusColumn := func(selector *entsql.Selector) string { return selector.C(redeemcode.FieldStatus) }
	typeColumn := func(selector *entsql.Selector) string { return selector.C(redeemcode.FieldType) }
	valueColumn := func(selector *entsql.Selector) string { return selector.C(redeemcode.FieldValue) }
	expiresAtColumn := func(selector *entsql.Selector) string { return selector.C(redeemcode.FieldExpiresAt) }
	usedByColumn := func(selector *entsql.Selector) string { return selector.C(redeemcode.FieldUsedBy) }
	usedAtColumn := func(selector *entsql.Selector) string { return selector.C(redeemcode.FieldUsedAt) }
	validityDaysColumn := func(selector *entsql.Selector) string { return selector.C(redeemcode.FieldValidityDays) }
	consistentUsed := func(selector *entsql.Selector) string {
		return statusColumn(selector) + " = '" + service.StatusUsed + "' AND " + usedByColumn(selector) + " IS NOT NULL AND " + usedAtColumn(selector) + " IS NOT NULL"
	}
	cleanUnused := func(selector *entsql.Selector) string {
		return statusColumn(selector) + " = '" + service.StatusUnused + "' AND " + usedByColumn(selector) + " IS NULL AND " + usedAtColumn(selector) + " IS NULL"
	}

	countWhere := func(alias string, predicate func(*entsql.Selector) string) dbent.AggregateFunc {
		return dbent.As(func(selector *entsql.Selector) string {
			return "COUNT(*) FILTER (WHERE " + predicate(selector) + ")"
		}, alias)
	}
	sumWhere := func(alias string, value func(*entsql.Selector) string, predicate func(*entsql.Selector) string) dbent.AggregateFunc {
		return dbent.As(func(selector *entsql.Selector) string {
			return "COALESCE(SUM(" + value(selector) + ") FILTER (WHERE " + predicate(selector) + "), 0)"
		}, alias)
	}

	var rows []redeemCodeStatsRow
	err := r.client.RedeemCode.Query().Aggregate(
		dbent.As(dbent.Count(), "total_codes"),
		countWhere("active_codes", func(selector *entsql.Selector) string {
			return cleanUnused(selector) + " AND (" + expiresAtColumn(selector) + " IS NULL OR " + expiresAtColumn(selector) + " > CURRENT_TIMESTAMP)"
		}),
		countWhere("used_codes", consistentUsed),
		countWhere("expired_codes", func(selector *entsql.Selector) string {
			return statusColumn(selector) + " = '" + service.StatusExpired + "' OR (" + statusColumn(selector) + " = '" + service.StatusUnused + "' AND " + expiresAtColumn(selector) + " IS NOT NULL AND " + expiresAtColumn(selector) + " <= CURRENT_TIMESTAMP)"
		}),
		countWhere("balance_codes", func(selector *entsql.Selector) string {
			return typeColumn(selector) + " IN ('" + service.RedeemTypeBalance + "', '" + service.AdjustmentTypeAdminBalance + "', '" + service.RedeemTypeAffiliateBalance + "')"
		}),
		countWhere("concurrency_codes", func(selector *entsql.Selector) string {
			return typeColumn(selector) + " IN ('" + service.RedeemTypeConcurrency + "', '" + service.AdjustmentTypeAdminConcurrency + "')"
		}),
		countWhere("subscription_codes", func(selector *entsql.Selector) string {
			return typeColumn(selector) + " = '" + service.RedeemTypeSubscription + "'"
		}),
		countWhere("invitation_codes", func(selector *entsql.Selector) string {
			return typeColumn(selector) + " = '" + service.RedeemTypeInvitation + "'"
		}),
		sumWhere("balance_value", valueColumn, func(selector *entsql.Selector) string {
			return consistentUsed(selector) + " AND " + valueColumn(selector) + " > 0 AND " + typeColumn(selector) + " IN ('" + service.RedeemTypeBalance + "', '" + service.AdjustmentTypeAdminBalance + "', '" + service.RedeemTypeAffiliateBalance + "')"
		}),
		sumWhere("concurrency_units", func(selector *entsql.Selector) string {
			return "TRUNC(" + valueColumn(selector) + ")"
		}, func(selector *entsql.Selector) string {
			return consistentUsed(selector) + " AND TRUNC(" + valueColumn(selector) + ") > 0 AND " + typeColumn(selector) + " IN ('" + service.RedeemTypeConcurrency + "', '" + service.AdjustmentTypeAdminConcurrency + "')"
		}),
		sumWhere("subscription_days", func(selector *entsql.Selector) string {
			return "CASE WHEN " + validityDaysColumn(selector) + " = 0 THEN 30 ELSE " + validityDaysColumn(selector) + " END"
		}, func(selector *entsql.Selector) string {
			return consistentUsed(selector) + " AND " + validityDaysColumn(selector) + " >= 0 AND " + typeColumn(selector) + " = '" + service.RedeemTypeSubscription + "'"
		}),
		countWhere("used_invitation_codes", func(selector *entsql.Selector) string {
			return consistentUsed(selector) + " AND " + typeColumn(selector) + " = '" + service.RedeemTypeInvitation + "'"
		}),
	).Scan(ctx, &rows)
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return &service.RedeemCodeStats{}, nil
	}

	row := rows[0]
	return &service.RedeemCodeStats{
		TotalCodes:            row.TotalCodes,
		ActiveCodes:           row.ActiveCodes,
		UsedCodes:             row.UsedCodes,
		ExpiredCodes:          row.ExpiredCodes,
		TotalValueDistributed: row.BalanceValue,
		ByType: service.RedeemCodeStatsByType{
			Balance:      row.BalanceCodes,
			Concurrency:  row.ConcurrencyCodes,
			Subscription: row.SubscriptionCodes,
			Invitation:   row.InvitationCodes,
		},
		DistributedByType: service.RedeemCodeDistributedByType{
			BalanceValue:     row.BalanceValue,
			ConcurrencyUnits: row.ConcurrencyUnits,
			SubscriptionDays: row.SubscriptionDays,
			InvitationCodes:  row.UsedInvitationCodes,
		},
	}, nil
}

func (r *redeemCodeRepository) List(ctx context.Context, params pagination.PaginationParams) ([]service.RedeemCode, *pagination.PaginationResult, error) {
	return r.ListWithFilters(ctx, params, "", "", "")
}

func (r *redeemCodeRepository) ListWithFilters(ctx context.Context, params pagination.PaginationParams, codeType, status, search string) ([]service.RedeemCode, *pagination.PaginationResult, error) {
	q := r.client.RedeemCode.Query()

	if codeType != "" {
		q = q.Where(redeemcode.TypeEQ(codeType))
	}
	if status != "" {
		now := time.Now()
		switch status {
		case service.StatusExpired:
			q = q.Where(redeemcode.Or(
				redeemcode.StatusEQ(service.StatusExpired),
				redeemcode.And(
					redeemcode.StatusEQ(service.StatusUnused),
					redeemcode.ExpiresAtNotNil(),
					redeemcode.ExpiresAtLTE(now),
				),
			))
		case service.StatusUnused:
			q = q.Where(
				redeemcode.StatusEQ(service.StatusUnused),
				redeemcode.UsedByIsNil(),
				redeemcode.UsedAtIsNil(),
				redeemcode.Or(
					redeemcode.ExpiresAtIsNil(),
					redeemcode.ExpiresAtGT(now),
				),
			)
		default:
			q = q.Where(redeemcode.StatusEQ(status))
		}
	}
	if search != "" {
		q = q.Where(
			redeemcode.Or(
				redeemcode.CodeContainsFold(search),
				redeemcode.HasUserWith(user.EmailContainsFold(search)),
			),
		)
	}

	total, err := q.Count(ctx)
	if err != nil {
		return nil, nil, err
	}

	codesQuery := q.
		WithUser().
		WithGroup().
		Offset(params.Offset()).
		Limit(params.Limit())
	for _, order := range redeemCodeListOrder(params) {
		codesQuery = codesQuery.Order(order)
	}

	codes, err := codesQuery.All(ctx)
	if err != nil {
		return nil, nil, err
	}

	outCodes := redeemCodeEntitiesToService(codes)

	return outCodes, paginationResultFromTotal(int64(total), params), nil
}

func redeemCodeListOrder(params pagination.PaginationParams) []func(*entsql.Selector) {
	sortBy := strings.ToLower(strings.TrimSpace(params.SortBy))
	sortOrder := params.NormalizedSortOrder(pagination.SortOrderDesc)

	var field string
	switch sortBy {
	case "type":
		field = redeemcode.FieldType
	case "value":
		field = redeemcode.FieldValue
	case "status":
		field = redeemcode.FieldStatus
	case "used_at":
		field = redeemcode.FieldUsedAt
	case "created_at":
		field = redeemcode.FieldCreatedAt
	case "expires_at":
		field = redeemcode.FieldExpiresAt
	case "code":
		field = redeemcode.FieldCode
	default:
		field = redeemcode.FieldID
	}

	if sortOrder == pagination.SortOrderAsc {
		return []func(*entsql.Selector){dbent.Asc(field), dbent.Asc(redeemcode.FieldID)}
	}
	return []func(*entsql.Selector){dbent.Desc(field), dbent.Desc(redeemcode.FieldID)}
}

func (r *redeemCodeRepository) Update(ctx context.Context, code *service.RedeemCode) error {
	up := r.client.RedeemCode.UpdateOneID(code.ID).
		SetCode(code.Code).
		SetType(code.Type).
		SetValue(code.Value).
		SetStatus(code.Status).
		SetNotes(code.Notes).
		SetValidityDays(code.ValidityDays)

	if code.UsedBy != nil {
		up.SetUsedBy(*code.UsedBy)
	} else {
		up.ClearUsedBy()
	}
	if code.UsedAt != nil {
		up.SetUsedAt(*code.UsedAt)
	} else {
		up.ClearUsedAt()
	}
	if code.GroupID != nil {
		up.SetGroupID(*code.GroupID)
	} else {
		up.ClearGroupID()
	}
	if code.ExpiresAt != nil {
		up.SetExpiresAt(*code.ExpiresAt)
	} else {
		up.ClearExpiresAt()
	}

	updated, err := up.Save(ctx)
	if err != nil {
		if dbent.IsNotFound(err) {
			return service.ErrRedeemCodeNotFound
		}
		return err
	}
	code.CreatedAt = updated.CreatedAt
	return nil
}

func (r *redeemCodeRepository) BatchUpdate(ctx context.Context, ids []int64, fields service.RedeemCodeBatchUpdateFields) (int64, error) {
	uniqueIDs := make([]int64, 0, len(ids))
	seen := make(map[int64]struct{}, len(ids))
	for _, id := range ids {
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		uniqueIDs = append(uniqueIDs, id)
	}
	if len(uniqueIDs) == 0 {
		return 0, nil
	}

	if tx := dbent.TxFromContext(ctx); tx != nil {
		return r.batchUpdate(ctx, tx.Client(), uniqueIDs, fields)
	}

	tx, err := r.client.Tx(ctx)
	if err != nil {
		return 0, err
	}
	txCtx := dbent.NewTxContext(ctx, tx)
	defer func() { _ = tx.Rollback() }()

	updated, err := r.batchUpdate(txCtx, tx.Client(), uniqueIDs, fields)
	if err != nil {
		return 0, err
	}
	if err := tx.Commit(); err != nil {
		return 0, err
	}
	return updated, nil
}

func (r *redeemCodeRepository) batchUpdate(ctx context.Context, client *dbent.Client, ids []int64, fields service.RedeemCodeBatchUpdateFields) (int64, error) {
	existing, err := client.RedeemCode.Query().
		Where(redeemcode.IDIn(ids...)).
		All(ctx)
	if err != nil {
		return 0, err
	}
	if len(existing) != len(ids) {
		return 0, service.ErrRedeemCodeNotFound
	}
	if fields.TouchesUsedSensitiveFields() {
		for _, code := range existing {
			if code.Status == service.StatusUsed || code.UsedBy != nil || code.UsedAt != nil {
				return 0, service.ErrRedeemCodeUsed
			}
		}
	}

	up := client.RedeemCode.Update().Where(redeemcode.IDIn(ids...))
	if fields.Status != nil {
		up.SetStatus(*fields.Status)
	}
	if fields.Notes != nil {
		up.SetNotes(*fields.Notes)
	}
	if fields.ExpiresAt.Set {
		if fields.ExpiresAt.Value != nil {
			up.SetExpiresAt(*fields.ExpiresAt.Value)
		} else {
			up.ClearExpiresAt()
		}
	}
	if fields.GroupID.Set {
		if fields.GroupID.Value != nil {
			up.SetGroupID(*fields.GroupID.Value)
		} else {
			up.ClearGroupID()
		}
	}

	affected, err := up.Save(ctx)
	if err != nil {
		return 0, err
	}
	if affected != len(ids) {
		return 0, service.ErrRedeemCodeNotFound
	}
	return int64(affected), nil
}

func (r *redeemCodeRepository) Use(ctx context.Context, id, userID int64) error {
	now := time.Now()
	client := clientFromContext(ctx, r.client)
	affected, err := client.RedeemCode.Update().
		Where(
			redeemcode.IDEQ(id),
			redeemcode.StatusEQ(service.StatusUnused),
			redeemcode.UsedByIsNil(),
			redeemcode.UsedAtIsNil(),
			redeemcode.Or(redeemcode.ExpiresAtIsNil(), redeemcode.ExpiresAtGT(now)),
		).
		SetStatus(service.StatusUsed).
		SetUsedBy(userID).
		SetUsedAt(now).
		Save(ctx)
	if err != nil {
		return err
	}
	if affected == 0 {
		return service.ErrRedeemCodeUsed
	}
	return nil
}

func (r *redeemCodeRepository) ListByUser(ctx context.Context, userID int64, limit int) ([]service.RedeemCode, error) {
	if limit <= 0 {
		limit = 10
	}

	codes, err := r.client.RedeemCode.Query().
		Where(redeemcode.UsedByEQ(userID)).
		WithGroup().
		Order(dbent.Desc(redeemcode.FieldUsedAt)).
		Limit(limit).
		All(ctx)
	if err != nil {
		return nil, err
	}

	return redeemCodeEntitiesToService(codes), nil
}

// ListByUserPaginated returns paginated balance/concurrency history for a user.
// Supports optional type filter (e.g. "balance", "admin_balance", "concurrency", "admin_concurrency", "subscription").
func (r *redeemCodeRepository) ListByUserPaginated(ctx context.Context, userID int64, params pagination.PaginationParams, codeType string) ([]service.RedeemCode, *pagination.PaginationResult, error) {
	q := r.client.RedeemCode.Query().
		Where(redeemcode.UsedByEQ(userID))

	// Optional type filter
	if codeType != "" {
		q = q.Where(redeemcode.TypeEQ(codeType))
	}

	total, err := q.Count(ctx)
	if err != nil {
		return nil, nil, err
	}

	codes, err := q.
		WithGroup().
		Offset(params.Offset()).
		Limit(params.Limit()).
		Order(dbent.Desc(redeemcode.FieldUsedAt)).
		All(ctx)
	if err != nil {
		return nil, nil, err
	}

	return redeemCodeEntitiesToService(codes), paginationResultFromTotal(int64(total), params), nil
}

// SumPositiveBalanceByUser returns total recharged amount (sum of value > 0 where type is balance/admin_balance).
func (r *redeemCodeRepository) SumPositiveBalanceByUser(ctx context.Context, userID int64) (float64, error) {
	var result []struct {
		Sum float64 `json:"sum"`
	}
	err := r.client.RedeemCode.Query().
		Where(
			redeemcode.UsedByEQ(userID),
			redeemcode.ValueGT(0),
			redeemcode.TypeIn("balance", "admin_balance"),
		).
		Aggregate(dbent.As(dbent.Sum(redeemcode.FieldValue), "sum")).
		Scan(ctx, &result)
	if err != nil {
		return 0, err
	}
	if len(result) == 0 {
		return 0, nil
	}
	return result[0].Sum, nil
}

func redeemCodeEntityToService(m *dbent.RedeemCode) *service.RedeemCode {
	if m == nil {
		return nil
	}
	out := &service.RedeemCode{
		ID:           m.ID,
		Code:         m.Code,
		Type:         m.Type,
		Value:        m.Value,
		Status:       m.Status,
		UsedBy:       m.UsedBy,
		UsedAt:       m.UsedAt,
		Notes:        derefString(m.Notes),
		CreatedAt:    m.CreatedAt,
		ExpiresAt:    m.ExpiresAt,
		GroupID:      m.GroupID,
		ValidityDays: m.ValidityDays,
	}
	if m.Edges.User != nil {
		out.User = userEntityToService(m.Edges.User)
	}
	if m.Edges.Group != nil {
		out.Group = groupEntityToService(m.Edges.Group)
	}
	return out
}

func redeemCodeEntitiesToService(models []*dbent.RedeemCode) []service.RedeemCode {
	out := make([]service.RedeemCode, 0, len(models))
	for i := range models {
		if s := redeemCodeEntityToService(models[i]); s != nil {
			out = append(out, *s)
		}
	}
	return out
}
