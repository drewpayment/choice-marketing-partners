# Vercel Environment Variables Configuration Guide

## Production Deployment Information
- **Deployment URL**: https://choice-marketing-partners-os5c419g1-drews-projects-c37795c7.vercel.app
- **Project Dashboard**: https://vercel.com/drews-projects-c37795c7/choice-marketing-partners

## Required Environment Variables for Production

### 1. Database Configuration
```
DATABASE_URL=mysql://[username]:[password]@[host]:[port]/[database]
```
**Note**: This should point to your production MySQL database. Consider using PlanetScale, Railway, or similar for managed MySQL.

### 2. Authentication (NextAuth.js)
```
NEXTAUTH_URL=https://choice-marketing-partners-os5c419g1-drews-projects-c37795c7.vercel.app
NEXTAUTH_SECRET=[generate-32-character-random-string]
```
**Generate secret**: `openssl rand -base64 32`

### 3. Vercel Blob Storage
```
BLOB_READ_WRITE_TOKEN=[your-vercel-blob-token]
```
**Setup**: Go to Vercel Dashboard → Storage → Create Blob Store → Copy token

### 4. Email Service (Optional)
```
RESEND_API_KEY=[your-resend-api-key]
```
**Setup**: Create account at resend.com → Get API key

### 5. Feature Flags
```
FEATURE_PDF_GENERATION=true
FEATURE_EMAIL_NOTIFICATIONS=true
```

### 6. Production Environment
```
NODE_ENV=production
```

## Steps to Configure in Vercel Dashboard:

1. **Access Project Settings**:
   - Go to: https://vercel.com/drews-projects-c37795c7/choice-marketing-partners
   - Click "Settings" tab

2. **Environment Variables Section**:
   - Click "Environment Variables" in left sidebar
   - Add each variable above with appropriate values

3. **Environment Scope**:
   - Set each variable for "Production" environment
   - Consider adding to "Preview" for staging testing

4. **Redeploy**:
   - After adding all variables, trigger a new deployment
   - Run: `vercel --prod` or push to main branch

## Security Considerations:

### Database Security:
- Use read/write user with minimal required permissions
- Enable SSL connection to database
- Whitelist Vercel IP ranges if using IP restrictions

### Authentication Security:
- Generate strong NEXTAUTH_SECRET (32+ characters)
- Enable HTTPS-only cookies in production
- Configure proper session timeout

### API Security:
- All API routes include authentication checks
- Rate limiting configured via Vercel
- Security headers enabled via next.config.ts

## Next Steps:

1. **Database Setup**: Configure production MySQL database
2. **Domain Configuration**: Set up custom domain (optional)
3. **Monitoring Setup**: Configure Sentry for error tracking
4. **Performance Monitoring**: Enable Vercel Analytics

## Testing Production Deployment:

1. **Health Check**: Visit /api/health endpoint
2. **Authentication**: Test login flow
3. **Database Connection**: Verify data loading
4. **File Storage**: Test document upload/download

## Troubleshooting:

- **Build Errors**: Check deployment logs in Vercel dashboard
- **Runtime Errors**: Monitor function logs and Sentry alerts
- **Database Issues**: Verify connection string and permissions
- **Authentication Issues**: Check NEXTAUTH_URL and secret configuration