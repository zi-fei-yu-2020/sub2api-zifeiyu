# EasyPay / Linux DO Credit Short Return Flow

## Problem

Linux DO Credit validates EasyPay and LDC `return_url` values with a maximum
length of 100 characters. The previous Sub2API flow appended `order_id`,
`out_trade_no`, `resume_token`, and `status` to `/payment/result` before the
payment request was signed, so the resulting URL could exceed that limit.

## Current flow

For EasyPay provider instances, including custom LDC payment methods, Sub2API
now sends one fixed provider-facing URL:

```text
https://<site-host>/api/v1/payment/return
```

The URL contains no order query string and is checked against the 100-character
EasyPay/LDC limit before the request is sent. EasyPay still includes this exact
`return_url` value in its normal MD5 signature.

After payment, the browser returns to the fixed endpoint with
`out_trade_no`. Sub2API then:

1. Resolves the local payment order.
2. Creates a signed resume token when payment resume signing is configured.
3. Redirects on the same origin to `/payment/result` with the local order
   fields and resume token.

The long query string therefore exists only on the browser-side redirect after
Linux DO Credit has accepted and processed the payment request.

## LDC custom method configuration

Configure an EasyPay provider instance and add `ldc` to its supported payment
types. The provider config can expose LDC as a custom method:

```json
{
  "pid": "<linux-do-credit-client-id>",
  "pkey": "<linux-do-credit-sign-key>",
  "apiBase": "https://credit.example.com",
  "notifyUrl": "https://your-sub2api.example.com/api/v1/payment/webhook/easypay",
  "returnUrl": "https://your-sub2api.example.com/api/v1/payment/return",
  "customMethods": "[{"type":"ldc","upstreamType":"ldc","displayName":"LDC"}]"
}
```

`returnUrl` remains required by the EasyPay provider configuration as a safe
fallback, but normal order creation overrides it with the fixed short callback.

The public reverse proxy must route both paths to Sub2API:

```text
/api/v1/payment/return
/api/v1/payment/webhook/easypay
```

## Upstream references

- Sub2API previous long ReturnURL builder:
  https://github.com/Wei-Shaw/sub2api/blob/main/backend/internal/service/payment_resume_service.go#L276
- Linux DO Credit 100-character ReturnURL validation:
  https://github.com/linux-do/credit/blob/master/internal/apps/payment/middlewares.go#L50
- Linux DO Credit signature generation and verification inputs:
  https://github.com/linux-do/credit/blob/master/internal/apps/payment/utils.go#L194
