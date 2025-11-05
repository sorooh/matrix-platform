# Quick Deployment Guide - Matrix Platform v11.0.0
## دليل النشر السريع - منصة Matrix v11.0.0

**Server**: senorbit-core (46.224.42.221)  
**Domain**: senorbit.ai  
**Status**: ⚠️ **DNS Not Configured**

---

## ⚠️ Current Issue

The error `DNS_PROBE_FINISHED_NXDOMAIN` means:
- Domain `senorbit.ai` DNS is not configured
- Domain does not point to server IP (46.224.42.221)

---

## 🚀 Solution: Deploy First, Configure DNS Later

### Step 1: Deploy to Server (Without DNS)

```bash
# Connect to server
ssh root@46.224.42.221

# Clone repository
cd /opt
git clone https://github.com/sorooh/matrix-platform.git matrix-platform
cd matrix-platform/server-deployment
chmod +x *.sh

# Deploy without DNS (HTTP only)
./deploy-without-dns.sh
```

This will:
- ✅ Install all system environment
- ✅ Setup database
- ✅ Configure Nginx (HTTP only)
- ✅ Start PM2
- ✅ Application accessible via IP: **http://46.224.42.221**

### Step 2: Configure DNS

After deployment, configure DNS:

#### Cloudflare (Recommended)
1. Login to Cloudflare
2. Add domain `senorbit.ai`
3. Add DNS records:
   - **A record**: @ → 46.224.42.221
   - **A record**: www → 46.224.42.221
4. Set SSL/TLS mode to **Full** or **Full (strict)**
5. Update nameservers at registrar

#### Other DNS Provider
1. Login to DNS provider
2. Add A records:
   - Host: @ → 46.224.42.221
   - Host: www → 46.224.42.221
3. Save changes

### Step 3: Verify DNS

Wait 5-30 minutes, then verify:

```bash
# On server
./check-dns.sh

# On local machine
nslookup senorbit.ai
# Should return: 46.224.42.221
```

### Step 4: Enable SSL

After DNS is configured and propagated:

```bash
# Setup SSL
./setup-ssl.sh

# Or run complete deployment
./deploy.sh
```

---

## ✅ After DNS is Configured

### 1. Verify DNS
```bash
nslookup senorbit.ai
# Should return: 46.224.42.221
```

### 2. Enable SSL
```bash
./setup-ssl.sh
```

### 3. Test HTTPS
```bash
curl https://senorbit.ai/health
```

---

## 📋 DNS Records Required

| Type | Name | Content | TTL |
|------|------|---------|-----|
| A | @ | 46.224.42.221 | Auto |
| A | www | 46.224.42.221 | Auto |

---

## 🔗 Current Access

While DNS is being configured:

- **IP Access**: http://46.224.42.221
- **Health**: http://46.224.42.221/health
- **Ready**: http://46.224.42.221/ready
- **Live**: http://46.224.42.221/live

---

## ⏱️ Timeline

1. **Deploy to Server**: 15-30 minutes
2. **Configure DNS**: 5 minutes
3. **DNS Propagation**: 5-30 minutes
4. **Enable SSL**: 5 minutes
5. **Total**: ~1 hour

---

**Status**: ⚠️ **Deploy First, Configure DNS Later**  
**Next Action**: Run `./deploy-without-dns.sh` on server

