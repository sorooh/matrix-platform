# Cloudflare Error 521 Fix - Matrix Platform v11.0.0
## إصلاح خطأ Cloudflare 521 - منصة Matrix v11.0.0

**Domain**: senorbit.ai  
**Error**: Cloudflare Error 521 - "Web server is down"  
**Status**: ⚠️ **Server Not Deployed**

---

## ⚠️ Problem

The error **521 - Web server is down** indicates:
- ✅ Cloudflare is working correctly
- ✅ Domain DNS is configured correctly
- ❌ **Server is not deployed or not responding**
- ❌ Application is not running on server

---

## 🚀 Solution: Deploy Server

The server needs to be deployed with the application. Follow these steps:

### Step 1: Connect to Server

```bash
ssh root@46.224.42.221
# Password: q7KUVagNFehLNtUeW3un
```

### Step 2: Clone Repository

```bash
cd /opt
git clone https://github.com/sorooh/matrix-platform.git matrix-platform
cd matrix-platform/server-deployment
chmod +x *.sh
```

### Step 3: Deploy Application

```bash
# Run complete deployment
./deploy.sh
```

This will:
- ✅ Install all system environment (Node.js, Nginx, PM2, PostgreSQL, Redis)
- ✅ Setup database
- ✅ Configure Nginx with SSL
- ✅ Setup SSL certificate (Certbot)
- ✅ Start PM2 application
- ✅ Application accessible via HTTPS

---

## 📋 Complete Deployment Steps

### Step 1: Install System Environment

```bash
cd /opt/matrix-platform/server-deployment
./install-server.sh
```

This installs:
- Node.js 20.x
- PM2
- Nginx
- PostgreSQL
- Redis
- Certbot
- Docker (optional)

### Step 2: Setup Database

```bash
./setup-database.sh
```

This:
- Creates database and user
- Enables pgvector extension
- Runs migrations
- Generates Prisma client

### Step 3: Setup SSL

```bash
./setup-ssl.sh
```

This:
- Obtains SSL certificate from Let's Encrypt
- Configures Nginx with SSL
- Sets up auto-renewal

### Step 4: Start Services

```bash
cd /opt/matrix-platform
pm2 start pm2.ecosystem.config.js
pm2 save
pm2 startup systemd
```

---

## 🔍 Verify Deployment

### Check Services Status

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

### Check Health Endpoints

```bash
# Health check (on server)
curl http://localhost:3000/health

# Should return:
# {"status":"healthy","version":"11.0.0",...}

# Through Nginx
curl http://localhost/health

# Through HTTPS (after SSL setup)
curl https://senorbit.ai/health
```

---

## 🆘 Troubleshooting

### Server Not Accessible

**Problem**: Cannot connect to server via SSH

**Solution**:
1. Check server IP: `46.224.42.221`
2. Check firewall allows SSH (port 22)
3. Verify SSH credentials
4. Try connecting from different network

### Application Not Starting

**Problem**: PM2 application not starting

**Solution**:
```bash
# Check PM2 logs
pm2 logs matrix-platform --lines 100

# Check application logs
tail -f /var/log/matrix-platform/error.log
tail -f /var/log/matrix-platform/out.log

# Restart PM2
pm2 restart matrix-platform

# Check database connection
psql -U matrix -d matrix -c "SELECT 1;"

# Check Redis connection
redis-cli ping
```

### Nginx Not Working

**Problem**: Nginx not serving requests

**Solution**:
```bash
# Check Nginx configuration
nginx -t

# Check Nginx status
systemctl status nginx

# Restart Nginx
systemctl restart nginx

# Check Nginx logs
tail -f /var/log/nginx/senorbit.ai.error.log
tail -f /var/log/nginx/senorbit.ai.access.log
```

### SSL Certificate Issues

**Problem**: SSL certificate not obtained

**Solution**:
```bash
# Check Certbot certificates
certbot certificates

# Manually obtain certificate
certbot --nginx -d senorbit.ai -d www.senorbit.ai \
    --non-interactive \
    --agree-tos \
    --email admin@senorbit.ai \
    --redirect

# Test certificate renewal
certbot renew --dry-run
```

---

## ✅ Expected Result

After deployment:

- ✅ **Server**: Running and accessible
- ✅ **Application**: PM2 running
- ✅ **Nginx**: Serving requests
- ✅ **SSL**: Certificate installed
- ✅ **HTTPS**: https://senorbit.ai working
- ✅ **Health**: https://senorbit.ai/health returns healthy status

---

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] Server accessible via SSH
- [ ] Repository cloned
- [ ] Scripts executable

### Deployment
- [ ] System environment installed
- [ ] Database setup complete
- [ ] SSL certificate obtained
- [ ] Nginx configured
- [ ] PM2 application running

### Post-Deployment
- [ ] Health check passing
- [ ] HTTPS working
- [ ] All services running
- [ ] No errors in logs

---

## 🎯 Quick Deployment Command

One command to deploy everything:

```bash
ssh root@46.224.42.221 "cd /opt && git clone https://github.com/sorooh/matrix-platform.git matrix-platform && cd matrix-platform/server-deployment && chmod +x *.sh && ./deploy.sh"
```

---

## 🔍 Verification Commands

### On Server

```bash
# Check all services
systemctl status nginx postgresql redis-server
pm2 status

# Test health endpoint
curl http://localhost:3000/health
curl https://senorbit.ai/health

# Check logs
pm2 logs matrix-platform --lines 50
tail -f /var/log/nginx/senorbit.ai.error.log
```

### From Local Machine

```bash
# Test HTTPS
curl https://senorbit.ai/health

# Check SSL certificate
openssl s_client -connect senorbit.ai:443 -servername senorbit.ai

# Test DNS
nslookup senorbit.ai
```

---

## 🎉 After Deployment

Once deployment is complete:

- ✅ **Domain**: https://senorbit.ai
- ✅ **Health**: https://senorbit.ai/health
- ✅ **Ready**: https://senorbit.ai/ready
- ✅ **Live**: https://senorbit.ai/live
- ✅ **No Errors**: Cloudflare Error 521 resolved

---

**Status**: ⚠️ **Server Deployment Required**  
**Next Action**: Deploy application to server  
**Timeline**: 30-45 minutes for complete deployment

