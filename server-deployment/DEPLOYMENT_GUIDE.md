# Server Deployment Guide - Matrix Platform v11.0.0
## دليل النشر على السيرفر - منصة Matrix v11.0.0

**Server**: senorbit-core (Hetzner Cloud)  
**IP**: 46.224.42.221  
**Domain**: senorbit.ai  
**Version**: 11.0.0

---

## 📋 Server Information

### Access Credentials
- **Server IP**: 46.224.42.221
- **User**: root
- **Password**: q7KUVagNFehLNtUeW3un
- **Domain**: senorbit.ai

### Important Notes
- ⚠️ **Change password on first login**
- 🔒 **Add SSH key for better security**
- 🌍 **Domain must point to server IP**

---

## 🚀 Quick Deployment

### Option 1: Automated Deployment (Recommended)

```bash
# Connect to server
ssh root@46.224.42.221

# Clone deployment scripts
cd /opt
git clone https://github.com/sorooh/matrix-platform.git matrix-platform
cd matrix-platform/server-deployment

# Make scripts executable
chmod +x *.sh

# Run complete deployment
./deploy.sh
```

### Option 2: Step-by-Step Deployment

```bash
# Step 1: Install system environment
./install-server.sh

# Step 2: Setup database
./setup-database.sh

# Step 3: Setup SSL
./setup-ssl.sh

# Step 4: Start services
cd /opt/matrix-platform
pm2 start pm2.ecosystem.config.js
pm2 save
pm2 startup systemd
```

---

## 📦 Manual Installation Steps

### 1. System Environment Setup

```bash
# Update system
apt-get update && apt-get upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Install Nginx
apt-get install -y nginx

# Install PostgreSQL
apt-get install -y postgresql postgresql-contrib

# Install Redis
apt-get install -y redis-server

# Install Docker (optional)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Certbot
apt-get install -y certbot python3-certbot-nginx
```

### 2. Clone Repository

```bash
# Create application directory
mkdir -p /opt/matrix-platform
cd /opt/matrix-platform

# Clone repository
git clone https://github.com/sorooh/matrix-platform.git .
git checkout v11.0.0

# Install dependencies
cd matrix-scaffold/backend
npm ci --production
```

### 3. Database Setup

```bash
# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE matrix;
CREATE USER matrix WITH ENCRYPTED PASSWORD 'matrix_password_2025';
GRANT ALL PRIVILEGES ON DATABASE matrix TO matrix;
\c matrix
GRANT ALL ON SCHEMA public TO matrix;
\q
EOF

# Enable pgvector extension
sudo -u postgres psql -d matrix -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Run migrations
cd /opt/matrix-platform/matrix-scaffold/backend
export DATABASE_URL="postgresql://matrix:matrix_password_2025@localhost:5432/matrix"
npx prisma migrate deploy
npx prisma generate
```

### 4. Build Application

```bash
cd /opt/matrix-platform/matrix-scaffold/backend
npm run build
```

### 5. Configure Nginx

```bash
# Copy configuration
cp /opt/matrix-platform/server-deployment/nginx-config.conf /etc/nginx/sites-available/senorbit.ai

# Enable site
ln -s /etc/nginx/sites-available/senorbit.ai /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test configuration
nginx -t

# Start Nginx
systemctl enable nginx
systemctl start nginx
```

### 6. Setup SSL

```bash
# Option A: Certbot (Let's Encrypt)
certbot --nginx -d senorbit.ai -d www.senorbit.ai \
    --non-interactive \
    --agree-tos \
    --email admin@senorbit.ai \
    --redirect

# Option B: Cloudflare SSL
# 1. Add DNS records in Cloudflare
# 2. Set SSL/TLS mode to 'Full' or 'Full (strict)'
# 3. Configure Origin Certificate if needed
```

### 7. Configure PM2

```bash
# Copy PM2 configuration
cp /opt/matrix-platform/server-deployment/pm2.config.js /opt/matrix-platform/pm2.ecosystem.config.js

# Create logs directory
mkdir -p /var/log/matrix-platform

# Start application
cd /opt/matrix-platform
pm2 start pm2.ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup systemd -u root --hp /root
```

### 8. Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw --force enable

# Configure fail2ban
systemctl enable fail2ban
systemctl start fail2ban
```

---

## ✅ Verification

### Health Checks

```bash
# Check health endpoint
curl https://senorbit.ai/health

# Check readiness
curl https://senorbit.ai/ready

# Check liveness
curl https://senorbit.ai/live

# Check metrics (internal only)
curl http://localhost:3000/metrics
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
# Backup database
pg_dump -U matrix matrix > /backup/matrix_$(date +%Y%m%d_%H%M%S).sql

# Restore database
psql -U matrix matrix < /backup/matrix_backup.sql
```

### Monitor Resources

```bash
# System resources
htop

# Disk usage
df -h

# Memory usage
free -h

# PM2 monitoring
pm2 monit
```

---

## 🔒 Security

### Change Root Password

```bash
passwd
```

### Setup SSH Key

```bash
# On local machine
ssh-keygen -t rsa -b 4096
ssh-copy-id root@46.224.42.221

# On server
nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
# Set: PubkeyAuthentication yes
systemctl restart sshd
```

### Update Environment Variables

```bash
# Edit environment file
nano /opt/matrix-platform/server-deployment/environment.env

# Update PM2 with new environment
pm2 restart matrix-platform --update-env
```

---

## 📊 Monitoring

### Health Endpoints

- **Health**: `https://senorbit.ai/health`
- **Ready**: `https://senorbit.ai/ready`
- **Live**: `https://senorbit.ai/live`
- **Metrics**: `http://localhost:3000/metrics` (internal only)

### Service Management

```bash
# PM2 commands
pm2 start matrix-platform
pm2 stop matrix-platform
pm2 restart matrix-platform
pm2 reload matrix-platform
pm2 delete matrix-platform
pm2 logs matrix-platform
pm2 monit

# System services
systemctl start nginx
systemctl stop nginx
systemctl restart nginx
systemctl status nginx
```

---

## 🆘 Troubleshooting

### Application Not Starting

```bash
# Check PM2 logs
pm2 logs matrix-platform --lines 100

# Check application logs
tail -f /var/log/matrix-platform/error.log
tail -f /var/log/matrix-platform/out.log

# Check database connection
psql -U matrix -d matrix -c "SELECT 1;"

# Check Redis connection
redis-cli ping
```

### SSL Issues

```bash
# Check SSL certificate
certbot certificates

# Renew SSL certificate
certbot renew --dry-run

# Test Nginx configuration
nginx -t

# Check SSL configuration
openssl s_client -connect senorbit.ai:443 -servername senorbit.ai
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

## 📋 Checklist

- [ ] System environment installed
- [ ] Repository cloned (v11.0.0)
- [ ] Dependencies installed
- [ ] Database created and configured
- [ ] Migrations run
- [ ] Application built
- [ ] Nginx configured
- [ ] SSL certificate obtained
- [ ] PM2 configured and running
- [ ] Firewall configured
- [ ] Health checks passing
- [ ] Domain pointing to server
- [ ] HTTPS working

---

## 🎉 Completion

After successful deployment:

- ✅ **Production URL**: https://senorbit.ai
- ✅ **Health Check**: https://senorbit.ai/health
- ✅ **Metrics**: http://localhost:3000/metrics
- ✅ **All Services**: Running
- ✅ **SSL**: Active
- ✅ **Monitoring**: Configured

**Matrix Platform v11.0.0 is now live on https://senorbit.ai! 🌍**

---

**Guide Generated**: 2025-01-05  
**Status**: ✅ **Ready for Deployment**

