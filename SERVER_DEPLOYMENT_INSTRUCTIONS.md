# Server Deployment Instructions - Matrix Platform v11.0.0
## تعليمات النشر على السيرفر - منصة Matrix v11.0.0

**Server**: senorbit-core (Hetzner Cloud)  
**IP**: 46.224.42.221  
**Domain**: senorbit.ai  
**Version**: 11.0.0

---

## 🚀 Quick Deployment Steps

### Step 1: Connect to Server
```bash
ssh root@46.224.42.221
# Password: aiadsham
```

**⚠️ Important**: Change password on first login!

### Step 2: Clone Deployment Scripts
```bash
cd /opt
git clone https://github.com/sorooh/matrix-platform.git matrix-platform
cd matrix-platform/server-deployment
chmod +x *.sh
```

### Step 3: Run Complete Deployment
```bash
./deploy.sh
```

This will automatically:
- ✅ Install system environment (Node.js, Nginx, PM2, Docker, PostgreSQL, Redis)
- ✅ Clone Matrix Platform v11.0.0 from GitHub
- ✅ Setup database (PostgreSQL with pgvector)
- ✅ Run database migrations
- ✅ Build application
- ✅ Configure Nginx
- ✅ Setup SSL (Certbot)
- ✅ Start all services (PM2)
- ✅ Verify deployment

---

## 📋 Manual Step-by-Step (Alternative)

### 1. Install System Environment
```bash
cd /opt/matrix-platform/server-deployment
./install-server.sh
```

### 2. Setup Database
```bash
./setup-database.sh
```

### 3. Setup SSL
```bash
./setup-ssl.sh
```

### 4. Start Services
```bash
cd /opt/matrix-platform
pm2 start pm2.ecosystem.config.js
pm2 save
pm2 startup systemd
```

---

## ✅ Verification

### Health Check
```bash
curl https://senorbit.ai/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "11.0.0",
  "timestamp": "2025-01-05T...",
  "checks": {
    "database": { "status": "healthy", "latency": 10 },
    "redis": { "status": "healthy", "latency": 5 },
    "modules": {
      "phase1": "active",
      "phase2": "active",
      "phase11": "active"
    },
    "services": {
      "api": "healthy",
      "security": "healthy",
      "observability": "healthy"
    }
  }
}
```

### Service Status
```bash
# Check Nginx
systemctl status nginx

# Check PostgreSQL
systemctl status postgresql

# Check Redis
systemctl status redis-server

# Check PM2
pm2 status
pm2 logs matrix-platform
```

---

## 🔒 Security Setup

### Change Root Password
```bash
passwd
```

### Setup SSH Key (Recommended)
```bash
# On your local machine
ssh-keygen -t rsa -b 4096
ssh-copy-id root@46.224.42.221

# On server - disable password authentication
nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
# Set: PubkeyAuthentication yes
systemctl restart sshd
```

### Update Environment Variables
```bash
# Edit environment file
nano /opt/matrix-platform/server-deployment/environment.env

# Update secrets
# - JWT_SECRET
# - ENCRYPTION_KEY
# - Database password
# - Other secrets

# Restart PM2 with new environment
pm2 restart matrix-platform --update-env
```

---

## 🌍 Domain Configuration

### DNS Records (Cloudflare or DNS Provider)

```
Type    Name    Content           TTL
A       @       46.224.42.221      Auto
A       www     46.224.42.221      Auto
CNAME   *       46.224.42.221      Auto
```

### SSL Configuration

**Option 1: Certbot (Let's Encrypt)** - Automatic
```bash
certbot --nginx -d senorbit.ai -d www.senorbit.ai \
    --non-interactive \
    --agree-tos \
    --email admin@senorbit.ai \
    --redirect
```

**Option 2: Cloudflare SSL**
1. Add DNS records in Cloudflare
2. Set SSL/TLS mode to 'Full' or 'Full (strict)'
3. Configure Origin Certificate if needed

---

## 📊 Monitoring

### Health Endpoints
- **Health**: `https://senorbit.ai/health`
- **Ready**: `https://senorbit.ai/ready`
- **Live**: `https://senorbit.ai/live`
- **Metrics**: `http://localhost:3000/metrics` (internal)

### Logs
```bash
# Application logs
pm2 logs matrix-platform

# Nginx logs
tail -f /var/log/nginx/senorbit.ai.access.log
tail -f /var/log/nginx/senorbit.ai.error.log

# System logs
journalctl -u nginx -f
journalctl -u postgresql -f
```

---

## 🔧 Maintenance

### Update Application
```bash
cd /opt/matrix-platform
git pull origin master
git checkout v11.0.0
cd matrix-scaffold/backend
npm ci --production
npx prisma migrate deploy
npx prisma generate
npm run build
pm2 restart matrix-platform
```

### Backup Database
```bash
# Create backup directory
mkdir -p /backup

# Backup database
pg_dump -U matrix matrix > /backup/matrix_$(date +%Y%m%d_%H%M%S).sql

# Restore database
psql -U matrix matrix < /backup/matrix_backup.sql
```

---

## 🆘 Troubleshooting

### Application Not Starting
```bash
# Check PM2 logs
pm2 logs matrix-platform --lines 100

# Check database connection
psql -U matrix -d matrix -c "SELECT 1;"

# Check Redis connection
redis-cli ping

# Check environment variables
pm2 env 0
```

### SSL Issues
```bash
# Check SSL certificate
certbot certificates

# Renew SSL certificate
certbot renew --dry-run

# Test Nginx configuration
nginx -t
```

### Database Issues
```bash
# Check PostgreSQL status
systemctl status postgresql

# Check database connection
psql -U matrix -d matrix

# Check migrations
cd /opt/matrix-platform/matrix-scaffold/backend
npx prisma migrate status
```

---

## 📋 Deployment Checklist

- [ ] SSH access to server
- [ ] Domain DNS pointing to server IP
- [ ] Run deployment script
- [ ] Verify health checks
- [ ] Check SSL certificate
- [ ] Verify all services running
- [ ] Test production URL
- [ ] Setup monitoring
- [ ] Configure backups
- [ ] Change root password
- [ ] Setup SSH keys
- [ ] Update environment variables

---

## 🎉 Completion

After successful deployment:

- ✅ **Production URL**: https://senorbit.ai
- ✅ **Health Check**: https://senorbit.ai/health
- ✅ **All Services**: Running
- ✅ **SSL**: Active
- ✅ **Monitoring**: Configured

**Matrix Platform v11.0.0 is now live on https://senorbit.ai! 🌍**

---

**Instructions Generated**: 2025-01-05  
**Status**: ✅ **Ready for Deployment**

