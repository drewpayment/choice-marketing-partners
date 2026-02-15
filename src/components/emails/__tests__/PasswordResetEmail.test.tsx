import React from 'react'
import PasswordResetEmail from '../PasswordResetEmail'

// Mock @react-email/components to avoid ESM dynamic import issues with Jest
jest.mock('@react-email/components', () => ({
  Html: ({ children }: { children: React.ReactNode }) => <html>{children}</html>,
  Head: () => <head />,
  Preview: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Body: ({ children, style }: { children: React.ReactNode; style?: object }) => <body style={style}>{children}</body>,
  Container: ({ children, style }: { children: React.ReactNode; style?: object }) => <div style={style}>{children}</div>,
  Heading: ({ children, style }: { children: React.ReactNode; style?: object }) => <h1 style={style}>{children}</h1>,
  Text: ({ children, style }: { children: React.ReactNode; style?: object }) => <p style={style}>{children}</p>,
  Link: ({ children, href, style }: { children: React.ReactNode; href: string; style?: object }) => <a href={href} style={style}>{children}</a>,
}))

describe('PasswordResetEmail', () => {
  it('renders without errors', () => {
    const element = (
      <PasswordResetEmail
        resetUrl="http://localhost:3000/auth/reset-password?token=abc123"
        email="user@test.com"
      />
    )

    expect(element).toBeTruthy()
    expect(element.props.resetUrl).toBe('http://localhost:3000/auth/reset-password?token=abc123')
    expect(element.props.email).toBe('user@test.com')
  })

  it('accepts the required props', () => {
    const resetUrl = 'http://localhost:3000/auth/reset-password?token=abc123'
    const email = 'user@test.com'

    const element = <PasswordResetEmail resetUrl={resetUrl} email={email} />

    expect(element).toBeTruthy()
    expect(element.props.resetUrl).toBe(resetUrl)
    expect(element.props.email).toBe(email)
  })
})
