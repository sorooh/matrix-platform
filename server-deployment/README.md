# Server Deployment - Matrix Platform v11.0.0
## نشر السيرفر - منصة Matrix v11.0.0

**Server**: senorbit-core (Hetzner Cloud)  
**IP**: 46.224.42.221  
**Domain**: senorbit.ai  
**Version**: 11.0.0

---

## 🚀 Quick Start

### 1. Connect to Server
```bash
ssh root@46.224.42.221
# Password: aiadsham
```

### 2. Run Deployment Script
```bash
cd /opt
git clone https://github.com/sorooh/matrix-platform.git matrix-platform
cd matrix-platform/server-deployment
chmod +x *.sh
./deploy.sh
```

---

## 📁 Files Included

- `install-server.sh` - Complete server installation
- `setup-database.sh` - Database setup
- `setup-ssl.sh` - SSL configuration
- `deploy.sh` - Complete deployment script
- `nginx-config.conf` - Nginx configuration
- `pm2.config.js` - PM2 ecosystem configuration
- `environment.env` - Environment variables template
- `DEPLOYMENT_GUIDE.md` - Complete deployment guide

---

## ✅ What Gets Installed

1. **System Environment**
   - Node.js 20.x
   - PM2
   - Nginx
   - PostgreSQL
   - Redis
   - Docker (optional)
   - Certbot

2. **Application**
   - Matrix Platform v11.0.0
   - Dependencies
   - Database migrations
   - Build

3. **Configuration**
   - Nginx reverse proxy
   - SSL certificates
   - PM2 process manager
   - Firewall rules
   - Fail2ban

4. **Services**
   - Backend API (PM2)
   - Nginx web server
   - PostgreSQL database
   - Redis cache

---

## 🔗 URLs

- **Production**: https://senorbit.ai
- **Health**: https://senorbit.ai/health
- **Ready**: https://senorbit.ai/ready
- **Live**: https://senorbit.ai/live
- **Metrics**: http://localhost:3000/metrics (internal)

---

## 📋 Prerequisites

- ✅ Domain DNS pointing to server IP (46.224.42.221)
- ✅ SSH access to server
- ✅ Root password or SSH key

---

## 🎯 Next Steps

1. Run deployment script
2. Verify health checks
3. Monitor services
4. Configure monitoring
5. Setup backups

---

**Status**: ✅ **Ready for Deployment**

