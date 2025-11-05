# UpCloud Setup Guide - Matrix Platform v11.0.0
## دليل إعداد UpCloud - منصة Matrix v11.0.0

**If you decide to use UpCloud instead of Hetzner Cloud**

---

## 🚀 UpCloud Setup Steps

### Step 1: Create UpCloud Account

1. Go to: https://hub.upcloud.com
2. Click: **Sign Up**
3. Create account
4. Verify email

### Step 2: Create Server

1. Go to: **Servers** → **Deploy Server**
2. **Choose Location**:
   - **Frankfurt** (recommended for EU)
   - **London** (alternative)
   - **Amsterdam** (alternative)
3. **Choose Plan**:
   - **4 vCPU, 16 GB RAM, 160 GB Storage**
   - **MaxIOPS Storage** (recommended)
4. **Configure**:
   - **Hostname**: `senorbit-core`
   - **Username**: `root`
   - **Password**: Set strong password
   - **SSH Keys**: Add if available

### Step 3: Deploy Application

Once server is created:

```bash
# Connect to server
ssh root@<UPCLOUD_IP>

# Clone repository
cd /opt
git clone https://github.com/sorooh/matrix-platform.git matrix-platform
cd matrix-platform/server-deployment
chmod +x *.sh

# Deploy application
./deploy.sh
```

### Step 4: Update DNS

1. Get server IP from UpCloud dashboard
2. Update Cloudflare DNS:
   - A record: @ → `<UPCLOUD_IP>`
   - A record: www → `<UPCLOUD_IP>`
3. Wait for propagation (5-30 minutes)

---

## 💰 UpCloud Pricing

### Server Specs (Similar to Hetzner)
- **4 vCPU, 16 GB RAM, 160 GB Storage**
- **Price**: ~€30-35/month
- **MaxIOPS Storage**: Additional cost
- **Traffic**: Included (varies by plan)

---

## ⚡ UpCloud Advantages

1. **MaxIOPS Storage**: Up to 100,000 IOPS
2. **Global Locations**: Multiple datacenters
3. **Better Support**: Premium support
4. **Advanced Features**: More options
5. **100% SLA**: Uptime guarantee

---

## ⚠️ UpCloud Considerations

1. **Price**: More expensive than Hetzner
2. **Setup Time**: Need to create new server
3. **Migration**: Need to migrate from Hetzner
4. **DNS Update**: Need to update DNS records

---

**Status**: 📋 **Alternative Option**  
**Recommendation**: **Stay with Hetzner Cloud** (already set up and cheaper)

