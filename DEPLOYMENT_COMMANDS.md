# Deployment Commands - Matrix Platform v11.0.0
## أوامر النشر - منصة Matrix v11.0.0

**Server**: senorbit-core (46.224.42.221)  
**Domain**: senorbit.ai

---

## 🚀 Quick Deployment (One Command)

```bash
ssh root@46.224.42.221 "cd /opt && git clone https://github.com/sorooh/matrix-platform.git matrix-platform && cd matrix-platform/server-deployment && chmod +x *.sh && ./deploy.sh"
```

---

## 📋 Step-by-Step Commands

### 1. Connect to Server
```bash
ssh root@46.224.42.221
# Password: q7KUVagNFehLNtUeW3un
```

### 2. Clone Repository
```bash
cd /opt
git clone https://github.com/sorooh/matrix-platform.git matrix-platform
cd matrix-platform/server-deployment
chmod +x *.sh
```

### 3. Run Deployment
```bash
./deploy.sh
```

---

## 🔧 Manual Commands

### Install System Environment
```bash
./install-server.sh
```

### Setup Database
```bash
./setup-database.sh
```

### Setup SSL
```bash
./setup-ssl.sh
```

### Start Services
```bash
cd /opt/matrix-platform
pm2 start pm2.ecosystem.config.js
pm2 save
pm2 startup systemd
```

---

## ✅ Verification Commands

### Health Check
```bash
curl https://senorbit.ai/health
```

### Service Status
```bash
systemctl status nginx
systemctl status postgresql
systemctl status redis-server
pm2 status
```

### Logs
```bash
pm2 logs matrix-platform
tail -f /var/log/nginx/senorbit.ai.access.log
```

---

**Status**: ✅ **Ready for Deployment**

