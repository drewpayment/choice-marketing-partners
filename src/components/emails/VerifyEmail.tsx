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

interface VerifyEmailProps {
  verifyUrl: string
  email: string
}

export default function VerifyEmail({ verifyUrl, email }: VerifyEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Verify your Choice Marketing Partners account</Preview>
      <Body style={{ backgroundColor: '#f6f9fc', fontFamily: 'sans-serif' }}>
        <Container style={{ margin: '0 auto', padding: '20px 0 48px' }}>
          <Heading style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
            Verify your email address
          </Heading>
          <Text style={{ fontSize: '16px', lineHeight: '24px' }}>
            Hello,
          </Text>
          <Text style={{ fontSize: '16px', lineHeight: '24px' }}>
            An account was created for you at Choice Marketing Partners ({email}).
          </Text>
          <Text style={{ fontSize: '16px', lineHeight: '24px' }}>
            Click the button below to verify this email address and set your
            password. You&apos;ll need to do this before you can sign in.
          </Text>
          <Link
            href={verifyUrl}
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
            Verify &amp; set password
          </Link>
          <Text style={{ fontSize: '14px', lineHeight: '24px', color: '#666' }}>
            If you weren&apos;t expecting this, you can safely ignore this email.
          </Text>
          <Text style={{ fontSize: '14px', lineHeight: '24px', color: '#666' }}>
            For security, this link will expire in 7 days.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
