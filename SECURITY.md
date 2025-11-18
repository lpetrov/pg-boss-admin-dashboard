# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Known Security Considerations

This dashboard is designed for **development and internal use only**. The following security considerations should be addressed before any production deployment:

### 1. Authentication & Authorization
- **Issue**: The dashboard has no built-in authentication
- **Risk**: Anyone with network access can view sensitive job data
- **Mitigation**: Implement authentication middleware before the dashboard routes

### 2. Cross-Site Scripting (XSS)
- **Issue**: User data is rendered without proper HTML escaping in some places
- **Risk**: Malicious job data could execute JavaScript in the dashboard
- **Mitigation**: All user data should be properly escaped before rendering

### 3. SQL Injection
- **Issue**: Some dynamic SQL construction in the stats endpoint
- **Risk**: Potential for SQL injection if input validation fails
- **Mitigation**: Use parameterized queries for all database operations

### 4. Cross-Origin Resource Sharing (CORS)
- **Issue**: CORS is configured to allow all origins
- **Risk**: Dashboard API can be accessed from any website
- **Mitigation**: Configure CORS to only allow trusted origins

### 5. Rate Limiting
- **Issue**: No rate limiting on API endpoints
- **Risk**: API abuse, DoS attacks
- **Mitigation**: Implement rate limiting middleware

## Recommended Production Setup

```javascript
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Security headers
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// CORS - configure for your domain
app.use(cors({
  origin: 'https://your-domain.com',
  credentials: true
}));

// Authentication middleware
app.use('/api/', requireAuth);
app.use('/', requireAuth);
```

## Reporting a Vulnerability

If you discover a security vulnerability, please:

1. **Do NOT** create a public GitHub issue
2. Email the details to: security@your-domain.com
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will acknowledge receipt within 48 hours and provide a detailed response within 7 days.

## Security Best Practices for Users

1. **Never expose the dashboard to the public internet** without proper authentication
2. **Use read-only database credentials** when possible
3. **Run behind a reverse proxy** (nginx, Apache) with SSL/TLS
4. **Use SSH tunnels** for remote access instead of exposing ports
5. **Regularly update dependencies** to patch known vulnerabilities
6. **Monitor access logs** for suspicious activity

## Database Security

When configuring database access:

```sql
-- Create a read-only user for the dashboard
CREATE ROLE pgboss_dashboard_readonly WITH LOGIN PASSWORD 'strong_password';
GRANT CONNECT ON DATABASE your_database TO pgboss_dashboard_readonly;
GRANT USAGE ON SCHEMA pgboss TO pgboss_dashboard_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA pgboss TO pgboss_dashboard_readonly;
```

## Environment Variables Security

- Never commit `.env` files to version control
- Use strong, unique passwords
- Rotate credentials regularly
- Use environment-specific configurations

## Disclaimer

This software is provided "as is" without warranty of any kind. Users are responsible for implementing appropriate security measures for their specific use case.