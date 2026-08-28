package service

import (
	"context"
	"fmt"
	"net/url"
	"strconv"
	"strings"

	dbent "github.com/Wei-Shaw/sub2api/ent"
	"github.com/Wei-Shaw/sub2api/ent/paymentorder"
	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
)

// BuildPaymentReturnRedirect resolves the EasyPay/LDC browser callback into a
// same-origin frontend result URL. The provider-facing ReturnURL stays fixed
// and short; the long signed resume token is added only after the browser has
// returned to Sub2API.
func (s *PaymentService) BuildPaymentReturnRedirect(ctx context.Context, outTradeNo string) (string, error) {
	outTradeNo = strings.TrimSpace(outTradeNo)
	if outTradeNo == "" {
		return "", infraerrors.BadRequest("INVALID_OUT_TRADE_NO", "out_trade_no is required")
	}
	order, err := s.entClient.PaymentOrder.Query().Where(paymentorder.OutTradeNoEQ(outTradeNo)).Only(ctx)
	if err != nil {
		if dbent.IsNotFound(err) {
			return "", infraerrors.NotFound("NOT_FOUND", "order not found")
		}
		return "", fmt.Errorf("resolve payment return order: %w", err)
	}

	resumeToken := ""
	resume := s.paymentResume()
	if resume != nil && resume.isSigningConfigured() {
		providerInstanceID := strings.TrimSpace(psStringValue(order.ProviderInstanceID))
		providerKey := strings.TrimSpace(psStringValue(order.ProviderKey))
		if snapshot := psOrderProviderSnapshot(order); snapshot != nil {
			if snapshot.ProviderInstanceID != "" {
				providerInstanceID = snapshot.ProviderInstanceID
			}
			if snapshot.ProviderKey != "" {
				providerKey = snapshot.ProviderKey
			}
		}
		resumeToken, err = resume.CreateToken(ResumeTokenClaims{
			OrderID:            order.ID,
			UserID:             order.UserID,
			ProviderInstanceID: providerInstanceID,
			ProviderKey:        providerKey,
			PaymentType:        order.PaymentType,
			CanonicalReturnURL: paymentResultReturnPath,
		})
		if err != nil {
			return "", fmt.Errorf("create payment return resume token: %w", err)
		}
	}

	query := url.Values{}
	query.Set("order_id", strconv.FormatInt(order.ID, 10))
	query.Set("out_trade_no", order.OutTradeNo)
	if resumeToken != "" {
		query.Set("resume_token", resumeToken)
	}
	query.Set("status", "success")
	return paymentResultReturnPath + "?" + query.Encode(), nil
}

func (s *PaymentService) GetPublicOrderByResumeToken(ctx context.Context, token string) (*dbent.PaymentOrder, error) {
	claims, err := s.paymentResume().ParseToken(strings.TrimSpace(token))
	if err != nil {
		return nil, err
	}

	order, err := s.entClient.PaymentOrder.Get(ctx, claims.OrderID)
	if err != nil {
		if dbent.IsNotFound(err) {
			return nil, infraerrors.NotFound("NOT_FOUND", "order not found")
		}
		return nil, fmt.Errorf("get order by resume token: %w", err)
	}
	if claims.UserID > 0 && order.UserID != claims.UserID {
		return nil, invalidResumeTokenMatchError()
	}
	snapshot := psOrderProviderSnapshot(order)
	orderProviderInstanceID := strings.TrimSpace(psStringValue(order.ProviderInstanceID))
	orderProviderKey := strings.TrimSpace(psStringValue(order.ProviderKey))
	if snapshot != nil {
		if snapshot.ProviderInstanceID != "" {
			orderProviderInstanceID = snapshot.ProviderInstanceID
		}
		if snapshot.ProviderKey != "" {
			orderProviderKey = snapshot.ProviderKey
		}
	}
	if claims.ProviderInstanceID != "" && orderProviderInstanceID != claims.ProviderInstanceID {
		return nil, invalidResumeTokenMatchError()
	}
	if claims.ProviderKey != "" && !strings.EqualFold(orderProviderKey, claims.ProviderKey) {
		return nil, invalidResumeTokenMatchError()
	}
	if claims.PaymentType != "" && NormalizeVisibleMethod(order.PaymentType) != NormalizeVisibleMethod(claims.PaymentType) {
		return nil, invalidResumeTokenMatchError()
	}
	if order.Status == OrderStatusPending || order.Status == OrderStatusExpired {
		result := s.reconcilePaid(ctx, order)
		if result == checkPaidResultAlreadyPaid {
			order, err = s.entClient.PaymentOrder.Get(ctx, order.ID)
			if err != nil {
				return nil, fmt.Errorf("reload order by resume token: %w", err)
			}
		}
	}

	return order, nil
}

func invalidResumeTokenMatchError() error {
	return infraerrors.BadRequest("INVALID_RESUME_TOKEN", "resume token does not match the payment order")
}

func (s *PaymentService) ParseWeChatPaymentResumeToken(token string) (*WeChatPaymentResumeClaims, error) {
	return s.paymentResume().ParseWeChatPaymentResumeToken(strings.TrimSpace(token))
}
