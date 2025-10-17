/**
 * Password generation utility
 * Matches legacy Laravel str_random(10) behavior
 */

/**
 * Generates a random password
 * @param length Password length (default: 10 to match legacy)
 * @returns Random password string
 */
export function generatePassword(length: number = 10): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let password = ''
  
  // Use crypto for secure random generation
  const randomValues = new Uint32Array(length)
  crypto.getRandomValues(randomValues)
  
  for (let i = 0; i < length; i++) {
    password += charset[randomValues[i] % charset.length]
  }
  
  return password
}

/**
 * Validates password strength
 * @param password Password to validate
 * @returns True if password meets minimum requirements
 */
export function isValidPassword(password: string): boolean {
  // Minimum 8 characters for manual passwords
  return password.length >= 8
}
