# DNS Setup Guide - Matrix Platform v11.0.0
## دليل إعداد DNS - منصة Matrix v11.0.0

**Domain**: senorbit.ai  
**Server IP**: 46.224.42.221  
**Status**: ⚠️ **DNS Not Configured Yet**

---

## ⚠️ Problem

The error `DNS_PROBE_FINISHED_NXDOMAIN` means:
- Domain `senorbit.ai` is not pointing to the server
- DNS records are not configured
- Domain DNS needs to be set up first

---

## 📋 DNS Records to Add

### Required Records

| Type | Name | Content | TTL | Priority |
|------|------|---------|-----|----------|
| A | @ | 46.224.42.221 | Auto | - |
| A | www | 46.224.42.221 | Auto | - |
| CNAME | * | 46.224.42.221 | Auto | - |

---

## 🔧 How to Setup DNS

### Option 1: Cloudflare (Recommended)

1. **Add Domain to Cloudflare**
   - Login to Cloudflare
   - Add domain `senorbit.ai`
   - Follow setup wizard

2. **Add DNS Records**
   - Go to DNS → Records
   - Add A record:
     - Type: A
     - Name: @
     - IPv4 address: 46.224.42.221
     - Proxy status: Proxied (orange cloud)
     - TTL: Auto
   - Add A record:
     - Type: A
     - Name: www
     - IPv4 address: 46.224.42.221
     - Proxy status: Proxied (orange cloud)
     - TTL: Auto

3. **Configure SSL/TLS**
   - Go to SSL/TLS → Overview
   - Set encryption mode to: **Full** or **Full (strict)**
   - This enables HTTPS

4. **Update Nameservers**
   - Cloudflare will provide nameservers
   - Update nameservers at your domain registrar
   - Wait for propagation (usually 5-30 minutes)

### Option 2: Direct DNS Provider

1. **Login to DNS Provider**
   - Access your domain registrar or DNS provider
   - Find DNS management section

2. **Add A Records**
   - Add A record:
     - Host: @
     - Points to: 46.224.42.221
     - TTL: 3600 (or Auto)
   - Add A record:
     - Host: www
     - Points to: 46.224.42.221
     - TTL: 3600 (or Auto)

3. **Save Changes**
   - Save DNS records
   - Wait for propagation

---

## ⏱️ DNS Propagation

- **Usually**: 5-30 minutes
- **Can take**: Up to 48 hours
- **Check**: Use `nslookup` or `dig` commands

---

## 🔍 Verify DNS Configuration

### On Local Machine (Windows)
```powershell
# Check DNS
nslookup senorbit.ai

# Should return: 46.224.42.221
```

### On Server (Linux)
```bash
# Check DNS
dig senorbit.ai
host senorbit.ai
nslookup senorbit.ai

# Should return: 46.224.42.221
```

### Online DNS Checkers
- https://dnschecker.org/
- https://www.whatsmydns.net/
- https://www.dnswatch.info/

---

## 🚀 Deployment Steps

### Step 1: Deploy Without SSL (Initial)

If DNS is not configured yet, deploy with HTTP only:

```bash
# Connect to server
ssh root@46.224.42.221

# Clone repository
cd /opt
git clone https://github.com/sorooh/matrix-platform.git matrix-platform
cd matrix-platform/server-deployment

# Make scripts executable
chmod +x *.sh

# Deploy without SSL
./setup-without-ssl.sh
```

This will:
- ✅ Install all system environment
- ✅ Setup database
- ✅ Configure Nginx (HTTP only)
- ✅ Start PM2
- ✅ Application accessible via IP: http://46.224.42.221

### Step 2: Configure DNS

Follow DNS setup guide above to point domain to server.

### Step 3: Verify DNS

```bash
# On server, check DNS
./check-dns.sh

# Should show: ✅ DNS is correctly configured!
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

### 1. Check DNS Propagation
```bash
# Wait 5-30 minutes
# Then check:
nslookup senorbit.ai
# Should return: 46.224.42.221
```

### 2. Run SSL Setup
```bash
./setup-ssl.sh
```

### 3. Verify HTTPS
```bash
curl https://senorbit.ai/health
# Should return: {"status":"healthy",...}
```

---

## 🆘 Troubleshooting

### DNS Not Resolving

**Problem**: `DNS_PROBE_FINISHED_NXDOMAIN`

**Solution**:
1. Check DNS records are added correctly
2. Wait for DNS propagation (5-30 minutes)
3. Clear DNS cache:
   ```powershell
   # Windows
   ipconfig /flushdns
   
   # Linux
   sudo systemd-resolve --flush-caches
   ```

### DNS Points to Wrong IP

**Problem**: Domain resolves to different IP

**Solution**:
1. Check DNS records
2. Update A records to: 46.224.42.221
3. Wait for propagation

### SSL Certificate Issues

**Problem**: Cannot obtain SSL certificate

**Solution**:
1. Ensure DNS is configured and propagated
2. Ensure domain points to server IP
3. Ensure ports 80 and 443 are open
4. Run certbot manually:
   ```bash
   certbot --nginx -d senorbit.ai -d www.senorbit.ai
   ```

---

## 📋 Checklist

- [ ] DNS records added (A records for @ and www)
- [ ] DNS records point to 46.224.42.221
- [ ] DNS propagation completed (checked with nslookup)
- [ ] Server accessible via IP (http://46.224.42.221)
- [ ] Domain resolves to server IP
- [ ] SSL certificate obtained
- [ ] HTTPS working (https://senorbit.ai)

---

## 🎯 Current Status

- ⚠️ **DNS Not Configured**: Domain `senorbit.ai` does not point to server
- ✅ **Server Ready**: Server is ready for deployment
- ✅ **IP Accessible**: Server accessible via IP: 46.224.42.221

---

## 📝 Next Steps

1. **Configure DNS**: Add DNS records as shown above
2. **Wait for Propagation**: Wait 5-30 minutes
3. **Verify DNS**: Run `./check-dns.sh` on server
4. **Enable SSL**: Run `./setup-ssl.sh`
5. **Verify HTTPS**: Test https://senorbit.ai/health

---

**Guide Generated**: 2025-01-05  
**Status**: ⚠️ **DNS Configuration Required**  
**Next Action**: Configure DNS records

