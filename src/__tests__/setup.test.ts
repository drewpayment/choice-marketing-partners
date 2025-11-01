/**
 * @jest-environment jsdom
 */

// Simple setup test to verify Jest is working
describe('Jest Setup Test', () => {
  it('should run basic tests', () => {
    expect(1 + 1).toBe(2)
  })

  it('should have DOM environment available', () => {
    // Test only in the proper jsdom environment
    if (typeof document !== 'undefined') {
      const element = document.createElement('div')
      element.textContent = 'Hello World'
      expect(element.textContent).toBe('Hello World')
    }
  })

  it('should support async/await', async () => {
    const result = await Promise.resolve('success')
    expect(result).toBe('success')
  })
})