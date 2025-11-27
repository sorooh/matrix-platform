# Quick Fix Error 521 - Matrix Platform v11.0.0
## إصلاح سريع لخطأ 521 - منصة Matrix v11.0.0

**Domain**: senorbit.ai  
**Error**: Cloudflare Error 521 - "Web server is down"  
**Quick Fix**: Deploy server

---

## ⚡ Quick Deployment (30 minutes)

### One-Line Command

```bash
ssh root@46.224.42.221 "cd /opt && git clone https://github.com/sorooh/matrix-platform.git matrix-platform && cd matrix-platform/server-deployment && chmod +x *.sh && ./deploy.sh"
```

This will:
- ✅ Install all system environment
- ✅ Setup database
- ✅ Configure Nginx
- ✅ Setup SSL
- ✅ Start application

---

## 📋 Step-by-Step Deployment

### Step 1: Connect to Server

```bash
ssh root@46.224.42.221
# Password: aiadsham
```

### Step 2: Clone Repository

```bash
cd /opt
git clone https://github.com/sorooh/matrix-platform.git matrix-platform
cd matrix-platform/server-deployment
chmod +x *.sh
```

### Step 3: Deploy

```bash
./deploy.sh
```

Wait 30-45 minutes for complete deployment.

---

## ✅ Verify Deployment

### Check Services

```bash
# Check services
systemctl status nginx
systemctl status postgresql
systemctl status redis-server
pm2 status

# Test health
curl http://localhost:3000/health
curl https://senorbit.ai/health
```

### Expected Result

```bash
curl https://senorbit.ai/health
# Should return: {"status":"healthy","version":"11.0.0",...}
```

---

## 🎯 After Deployment

- ✅ **Domain**: https://senorbit.ai
- ✅ **Health**: https://senorbit.ai/health
- ✅ **Error 521**: Resolved

---

**Status**: ⚠️ **Deploy Server Now**  
**Time**: 30-45 minutes  
**Next Action**: Run deployment script

