import { safeJsonParse } from '@/lib/utils/safe-json'
import { logger } from '@/lib/utils/logger'

describe('safeJsonParse', () => {
  it('parses a valid JSON string', () => {
    expect(safeJsonParse('{"a":1}', {})).toEqual({ a: 1 })
    expect(safeJsonParse('[1,2,3]', [])).toEqual([1, 2, 3])
  })

  it('passes through an already-parsed object unchanged', () => {
    const obj = { a: 1 }
    expect(safeJsonParse(obj, {})).toBe(obj)
  })

  it('passes through an already-parsed array unchanged', () => {
    const arr = [1, 2, 3]
    expect(safeJsonParse(arr, [])).toBe(arr)
  })

  it('returns the fallback for null', () => {
    expect(safeJsonParse(null, 'fallback')).toBe('fallback')
  })

  it('returns the fallback for undefined', () => {
    expect(safeJsonParse(undefined, 'fallback')).toBe('fallback')
  })

  it('returns the fallback and logs a warning for malformed JSON', () => {
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {})

    const result = safeJsonParse('{not valid json', 'fallback')

    expect(result).toBe('fallback')
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy.mock.calls[0][0]).toContain('safeJsonParse')

    warnSpy.mockRestore()
  })

  it('includes the provided context in the warning log', () => {
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {})

    safeJsonParse('{bad', [], 'MyRepo.someField')

    expect(warnSpy.mock.calls[0][0]).toContain('MyRepo.someField')

    warnSpy.mockRestore()
  })

  it('does not log when value is nullish', () => {
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {})

    safeJsonParse(null, 'fallback')
    safeJsonParse(undefined, 'fallback')

    expect(warnSpy).not.toHaveBeenCalled()

    warnSpy.mockRestore()
  })
})
