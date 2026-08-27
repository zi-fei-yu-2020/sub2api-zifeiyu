import { describe, expect, it } from 'vitest'
import {
  isSafePaymentRedirectURL,
  normalizePaymentRedirectURL,
} from '@/components/payment/paymentRedirect'

describe('normalizePaymentRedirectURL', () => {
  it.each([
    ['https://pay.example.com/checkout?id=1#pay', 'https://pay.example.com/checkout?id=1#pay'],
    ['  https://pay.example.com/checkout  ', 'https://pay.example.com/checkout'],
    ['/payment/result?order_id=1', '/payment/result?order_id=1'],
    ['/payment/stripe#checkout', '/payment/stripe#checkout'],
  ])('accepts safe redirect %s', (value, expected) => {
    expect(normalizePaymentRedirectURL(value)).toBe(expected)
    expect(isSafePaymentRedirectURL(value)).toBe(true)
  })

  it.each([
    'javascript:alert(1)',
    'data:text/html,boom',
    'file:///etc/passwd',
    'blob:https://pay.example.com/id',
    'http://pay.example.com/checkout',
    '//evil.example/checkout',
    '/\\evil.example/checkout',
    'payment/result',
    'https:///missing-host',
    'https://trusted.example@evil.example/checkout',
    'https://pay.example.com/checkout\r\nX-Test: yes',
    'https://pay.example.com/checkout%0d%0aX-Test',
    'https://pay.example.com/checkout%250aX-Test',
    'https://pay.example.com/%zz',
  ])('rejects unsafe redirect %s', (value) => {
    expect(normalizePaymentRedirectURL(value)).toBe('')
    expect(isSafePaymentRedirectURL(value)).toBe(false)
  })

  it('does not treat dedicated QR schemes as browser redirects', () => {
    expect(normalizePaymentRedirectURL('weixin://wxpay/bizpayurl?pr=test')).toBe('')
    expect(normalizePaymentRedirectURL('alipays://platformapi/startapp?saId=10000007')).toBe('')
  })
})
