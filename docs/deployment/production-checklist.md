# Production Deployment Checklist

## Pre-Deployment Checklist

### 1. Environment Configuration

- [ ] **Environment Variables**
  ```bash
  # Required
  NEXT_PUBLIC_OCTOPART_API_KEY=<valid-api-key>
  OPENAI_API_KEY=<valid-api-key>
  REDIS_URL=<redis-connection-string>
  
  # Optional but recommended
  NEXT_PUBLIC_API_URL=https://api.yourdomain.com
  SENTRY_DSN=<error-tracking-dsn>
  ```

- [ ] **API Keys Validation**
  - Verify Octopart API key is not expired
  - Verify OpenAI API key has sufficient quota
  - Test Redis connection

### 2. Build Verification

- [ ] **Production Build**
  ```bash
  npm run build
  ```
  - No TypeScript errors
  - No ESLint errors
  - Build completes successfully

- [ ] **Bundle Size Check**
  ```bash
  npm run analyze
  ```
  - Main bundle < 500KB
  - No unexpected large dependencies

### 3. Testing

- [ ] **All Tests Pass**
  ```bash
  npm test -- --coverage
  ```
  - Unit tests: 100% pass
  - Integration tests: 100% pass
  - Coverage > 70%

- [ ] **E2E Tests** (if available)
  ```bash
  npm run test:e2e
  ```

### 4. Performance

- [ ] **Lighthouse Audit**
  - Performance score > 90
  - Accessibility score > 95
  - Best practices score > 95
  - SEO score > 90

- [ ] **Load Testing**
  - Can handle 100 concurrent users
  - Response time < 2s for all endpoints
  - No memory leaks after extended use

### 5. Security

- [ ] **Security Audit**
  ```bash
  npm audit
  ```
  - No high severity vulnerabilities
  - All medium vulnerabilities reviewed

- [ ] **API Security**
  - CORS properly configured
  - Rate limiting enabled
  - API keys not exposed in client

- [ ] **Content Security Policy**
  ```javascript
  // next.config.js
  {
    headers: [
      {
        key: 'Content-Security-Policy',
        value: "default-src 'self'; script-src 'self' 'unsafe-eval'..."
      }
    ]
  }
  ```

### 6. Database & Cache

- [ ] **Redis Configuration**
  - Persistence enabled
  - Backup strategy in place
  - Memory limits configured

- [ ] **Data Migration**
  - Migration scripts tested
  - Rollback plan prepared
  - Data backup completed

### 7. Monitoring

- [ ] **Error Tracking**
  - Sentry/ErrorTracking configured
  - Source maps uploaded
  - Alert rules configured

- [ ] **Performance Monitoring**
  - APM tool configured (New Relic/DataDog)
  - Key metrics identified
  - Dashboard created

- [ ] **Logging**
  - Structured logging implemented
  - Log aggregation configured
  - Log retention policy set

## Deployment Process

### 1. Pre-Deployment

```bash
# 1. Create deployment branch
git checkout -b release/v1.0.0

# 2. Update version
npm version minor

# 3. Generate changelog
npm run changelog

# 4. Final test run
npm test
npm run build
```

### 2. Deployment Steps

#### Option A: Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod

# Set environment variables
vercel env add OPENAI_API_KEY production
vercel env add NEXT_PUBLIC_OCTOPART_API_KEY production
```

#### Option B: Docker Deployment

```bash
# Build Docker image
docker build -t orboh:latest .

# Tag for registry
docker tag orboh:latest registry.yourdomain.com/orboh:latest

# Push to registry
docker push registry.yourdomain.com/orboh:latest

# Deploy to Kubernetes
kubectl apply -f k8s/deployment.yaml
```

#### Option C: Traditional Server

```bash
# SSH to server
ssh deploy@yourserver.com

# Pull latest code
git pull origin main

# Install dependencies
npm ci --production

# Build application
npm run build

# Restart service
pm2 restart orboh
```

### 3. Post-Deployment Verification

- [ ] **Smoke Tests**
  - Homepage loads
  - Can add components
  - Chat interface works
  - AI search returns results
  - Compatibility check runs

- [ ] **API Health Checks**
  ```bash
  curl https://api.yourdomain.com/health
  # Expected: {"status": "ok", "version": "1.0.0"}
  ```

- [ ] **Feature Verification**
  - [ ] Dynamic port generation works
  - [ ] Compatibility warnings appear
  - [ ] Order list exports correctly
  - [ ] Offline mode activates when disconnected

- [ ] **Performance Check**
  - Initial load time < 3s
  - Time to interactive < 5s
  - No console errors

### 4. Rollback Plan

If issues are detected:

```bash
# Vercel
vercel rollback

# Docker/K8s
kubectl rollout undo deployment/orboh

# Traditional
pm2 restart orboh --update-env
git checkout previous-version
npm ci --production
npm run build
pm2 restart orboh
```

## Production Configuration Files

### 1. Dockerfile

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/package*.json ./
RUN npm ci --production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["npm", "start"]
```

### 2. docker-compose.yml

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
  
  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

volumes:
  redis-data:
```

### 3. nginx.conf

```nginx
server {
    listen 80;
    server_name orboh.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name orboh.yourdomain.com;

    ssl_certificate /etc/ssl/certs/orboh.crt;
    ssl_certificate_key /etc/ssl/private/orboh.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Maintenance Mode

### Enable Maintenance Mode

```bash
# Create maintenance page
echo "Under maintenance. Back soon!" > public/maintenance.html

# Update nginx to serve maintenance page
# Add to nginx.conf:
location / {
    if (-f $document_root/maintenance.html) {
        return 503;
    }
    # ... normal proxy config
}

error_page 503 @maintenance;
location @maintenance {
    root /path/to/public;
    rewrite ^(.*)$ /maintenance.html break;
}
```

### Disable Maintenance Mode

```bash
rm public/maintenance.html
nginx -s reload
```

## Troubleshooting Production Issues

### High Memory Usage

```bash
# Check Node.js memory
pm2 monit

# Increase memory limit if needed
pm2 start app.js --max-memory-restart 1G
```

### Slow Performance

1. Check Redis connection
2. Verify API keys are working
3. Check for N+1 queries
4. Review React component re-renders

### 502/503 Errors

1. Check if app is running: `pm2 status`
2. Check logs: `pm2 logs`
3. Verify port is not blocked
4. Check nginx error logs

## Contact Information

- **DevOps Lead**: devops@yourcompany.com
- **On-Call Engineer**: +1-XXX-XXX-XXXX
- **Escalation**: engineering-lead@yourcompany.com

## Emergency Procedures

1. **Complete Outage**
   - Switch to maintenance mode
   - Check all services status
   - Review recent deployments
   - Rollback if necessary

2. **Data Corruption**
   - Stop write operations
   - Restore from backup
   - Verify data integrity
   - Resume operations

3. **Security Breach**
   - Rotate all API keys immediately
   - Review access logs
   - Patch vulnerabilities
   - Notify security team