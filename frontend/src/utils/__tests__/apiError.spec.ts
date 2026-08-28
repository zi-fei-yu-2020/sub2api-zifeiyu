import { describe, expect, it } from 'vitest'
import {
  extractApiErrorCode,
  extractApiErrorMessage,
  extractApiErrorMetadata,
  extractApiErrorReason,
  extractApiErrorStatus,
  isApiErrorCode,
  normalizeApiError,
} from '../apiError'

describe('apiError', () => {
  it('normalizes interceptor structured errors', () => {
    const error = { status: 422, code: 'INVALID', reason: 'bad_input', message: 'Invalid value', metadata: { field: 'name' } }
    expect(normalizeApiError(error)).toEqual(error)
    expect(extractApiErrorStatus(error)).toBe(422)
    expect(extractApiErrorCode(error)).toBe('INVALID')
    expect(extractApiErrorReason(error)).toBe('bad_input')
    expect(extractApiErrorMetadata(error)).toEqual({ field: 'name' })
    expect(extractApiErrorMessage(error, 'fallback')).toBe('Invalid value')
  })

  it('supports legacy axios error shapes', () => {
    const error = { response: { status: 409, data: { detail: 'Already exists', code: 'CONFLICT', metadata: { id: 1 } } } }
    expect(extractApiErrorStatus(error)).toBe(409)
    expect(extractApiErrorCode(error)).toBe('CONFLICT')
    expect(extractApiErrorMessage(error, 'fallback')).toBe('Already exists')
    expect(extractApiErrorMetadata(error)).toEqual({ id: 1 })
  })

  it('matches business identifiers across code reason and error fields', () => {
    expect(isApiErrorCode({ reason: 'DISABLED' }, 'DISABLED')).toBe(true)
    expect(isApiErrorCode({ error: 'mixed_channel_warning' }, 'mixed_channel_warning')).toBe(true)
  })

  it('falls back for unknown objects', () => {
    expect(extractApiErrorMessage({}, 'fallback')).toBe('fallback')
  })
})
