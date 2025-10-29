import { render } from '@react-email/components'
import PasswordResetEmail from '../PasswordResetEmail'

describe('PasswordResetEmail', () => {
  it('renders with reset URL and email without errors', () => {
    // Render the component - this will throw if there are errors
    const result = render(
      <PasswordResetEmail
        resetUrl="http://localhost:3000/auth/reset-password?token=abc123"
        email="user@test.com"
      />
    )

    // Verify it returns something (the render function returns a ReactElement)
    expect(result).toBeTruthy()
  })

  it('accepts the required props', () => {
    const resetUrl = 'http://localhost:3000/auth/reset-password?token=abc123'
    const email = 'user@test.com'

    // This test verifies TypeScript types are correct and component accepts props
    const result = render(
      <PasswordResetEmail resetUrl={resetUrl} email={email} />
    )

    expect(result).toBeTruthy()
  })
})
