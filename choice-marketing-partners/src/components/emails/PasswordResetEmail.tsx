import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components'

interface PasswordResetEmailProps {
  resetUrl: string
  email: string
}

export default function PasswordResetEmail({
  resetUrl,
  email,
}: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your Choice Marketing Partners password</Preview>
      <Body style={{ backgroundColor: '#f6f9fc', fontFamily: 'sans-serif' }}>
        <Container style={{ margin: '0 auto', padding: '20px 0 48px' }}>
          <Heading style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
            Password Reset Request
          </Heading>
          <Text style={{ fontSize: '16px', lineHeight: '24px' }}>
            Hello,
          </Text>
          <Text style={{ fontSize: '16px', lineHeight: '24px' }}>
            We received a request to reset the password for your account ({email}).
          </Text>
          <Text style={{ fontSize: '16px', lineHeight: '24px' }}>
            Click the link below to reset your password. This link will expire in 1 hour.
          </Text>
          <Link
            href={resetUrl}
            style={{
              backgroundColor: '#5F51E8',
              borderRadius: '3px',
              color: '#fff',
              fontSize: '16px',
              textDecoration: 'none',
              textAlign: 'center',
              display: 'block',
              padding: '12px',
              marginTop: '20px',
              marginBottom: '20px',
            }}
          >
            Reset Password
          </Link>
          <Text style={{ fontSize: '14px', lineHeight: '24px', color: '#666' }}>
            If you didn't request this password reset, you can safely ignore this email.
          </Text>
          <Text style={{ fontSize: '14px', lineHeight: '24px', color: '#666' }}>
            For security, this link will expire in 1 hour.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
