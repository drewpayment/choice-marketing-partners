import {
  getEmployeeVisibilityCutoff,
  isPaystubReleasedForEmployee,
  toIssueDateString,
  DEFAULT_RELEASE_HOUR,
  DEFAULT_RELEASE_MINUTE,
} from '@/lib/utils/payroll-visibility'

/**
 * Business rule under test:
 * Pay day is Wednesday. A paystub dated for a given Wednesday is released to
 * non-admins at 8:00pm (the configured restriction time) on the preceding
 * Tuesday, evaluated in America/Detroit. Past paystubs are always visible;
 * future ones stay hidden until their release moment.
 */
describe('payroll-visibility', () => {
  const release = { hour: 20, minute: 0 } // 8:00pm

  describe('getEmployeeVisibilityCutoff', () => {
    it('defaults to 8:00pm when no release time provided', () => {
      expect(DEFAULT_RELEASE_HOUR).toBe(20)
      expect(DEFAULT_RELEASE_MINUTE).toBe(0)
    })

    it('keeps cutoff at today before the release time (EDT)', () => {
      // Tue Jun 16 2026, 7:59pm Detroit (EDT, UTC-4) => 23:59Z
      const now = new Date('2026-06-16T23:59:00Z')
      expect(getEmployeeVisibilityCutoff(release, now)).toBe('2026-06-16')
    })

    it('advances cutoff to tomorrow at/after the release time (EDT)', () => {
      // Tue Jun 16 2026, 8:00pm Detroit (EDT, UTC-4) => Jun 17 00:00Z
      const now = new Date('2026-06-17T00:00:00Z')
      expect(getEmployeeVisibilityCutoff(release, now)).toBe('2026-06-17')
    })

    it('handles standard time (EST, UTC-5) correctly', () => {
      // Tue Jan 6 2026, 7:59pm Detroit (EST, UTC-5) => Jan 7 00:59Z -> cutoff today
      expect(getEmployeeVisibilityCutoff(release, new Date('2026-01-07T00:59:00Z'))).toBe(
        '2026-01-06'
      )
      // Tue Jan 6 2026, 8:00pm Detroit (EST, UTC-5) => Jan 7 01:00Z -> cutoff tomorrow
      expect(getEmployeeVisibilityCutoff(release, new Date('2026-01-07T01:00:00Z'))).toBe(
        '2026-01-07'
      )
    })
  })

  describe('isPaystubReleasedForEmployee', () => {
    // Reference week: payday Wednesday Jun 17 2026.
    const beforeRelease = new Date('2026-06-16T23:59:00Z') // Tue 7:59pm Detroit
    const atRelease = new Date('2026-06-17T00:00:00Z') // Tue 8:00pm Detroit

    it("hides this week's paystub before 8pm Tuesday", () => {
      expect(isPaystubReleasedForEmployee('2026-06-17', release, beforeRelease)).toBe(false)
    })

    it("reveals this week's paystub at 8pm Tuesday", () => {
      expect(isPaystubReleasedForEmployee('2026-06-17', release, atRelease)).toBe(true)
    })

    it('always shows past paystubs', () => {
      expect(isPaystubReleasedForEmployee('2026-06-10', release, beforeRelease)).toBe(true)
      expect(isPaystubReleasedForEmployee('2026-05-01', release, beforeRelease)).toBe(true)
    })

    it('hides next week and other future paystubs', () => {
      // Even right after this week's release, next week's stays hidden
      expect(isPaystubReleasedForEmployee('2026-06-24', release, atRelease)).toBe(false)
      expect(isPaystubReleasedForEmployee('2026-07-01', release, atRelease)).toBe(false)
    })

    it("shows payday's paystub on payday morning (before 8pm)", () => {
      // Wed Jun 17 2026, 9:00am Detroit => 13:00Z, before 8pm
      const paydayMorning = new Date('2026-06-17T13:00:00Z')
      expect(isPaystubReleasedForEmployee('2026-06-17', release, paydayMorning)).toBe(true)
    })

    it('accepts Date issue dates and ISO datetime strings', () => {
      expect(isPaystubReleasedForEmployee(new Date('2026-06-17T00:00:00Z'), release, atRelease)).toBe(
        true
      )
      expect(isPaystubReleasedForEmployee('2026-06-24T00:00:00.000Z', release, atRelease)).toBe(false)
    })
  })

  describe('toIssueDateString', () => {
    it('normalizes strings and dates to YYYY-MM-DD', () => {
      expect(toIssueDateString('2026-06-17')).toBe('2026-06-17')
      expect(toIssueDateString('2026-06-17T12:34:56.000Z')).toBe('2026-06-17')
      expect(toIssueDateString(new Date('2026-06-17T00:00:00Z'))).toBe('2026-06-17')
    })
  })
})
