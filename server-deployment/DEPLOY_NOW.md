# Deploy Now - Matrix Platform v11.0.0
## نشر الآن - منصة Matrix v11.0.0

**Server**: 46.224.42.221  
**Domain**: senorbit.ai  
**Password**: q7KUVagNFehLNtUeW3un

---

## 🚀 Quick Deploy (One Command)

### Option 1: Windows (PowerShell)

```powershell
# Copy and paste this command:
ssh -o StrictHostKeyChecking=no root@46.224.42.221 "bash -s" < deploy-remote.sh
```

### Option 2: Windows (Git Bash)

```bash
# Copy and paste this command:
ssh -o StrictHostKeyChecking=no root@46.224.42.221 "bash -s" < deploy-remote.sh
```

### Option 3: Linux/Mac

```bash
# Copy and paste this command:
ssh -o StrictHostKeyChecking=no root@46.224.42.221 "bash -s" < deploy-remote.sh
```

**When prompted for password, enter**: `q7KUVagNFehLNtUeW3un`

---

## 📋 Manual Deploy (Step-by-Step)

### Step 1: Open Terminal/Command Prompt

- **Windows**: PowerShell or Git Bash
- **Linux/Mac**: Terminal

### Step 2: Navigate to Project Directory

```bash
cd C:\Users\Zulik\matrix-platform\server-deployment
```

### Step 3: Run Deployment Script

```bash
# Copy deploy-remote.sh to server and run it
scp deploy-remote.sh root@46.224.42.221:/tmp/
ssh root@46.224.42.221 "bash /tmp/deploy-remote.sh"
```

**Password**: `q7KUVagNFehLNtUeW3un`

---

## 🔍 After Deployment

### Verify Deployment

```bash
# Test health endpoint
curl https://senorbit.ai/health

# Should return:
# {"status":"healthy","version":"11.0.0",...}
```

### Check Services

```bash
# SSH to server
ssh root@46.224.42.221

# Check services
systemctl status nginx
systemctl status postgresql
systemctl status redis-server
pm2 status
```

---

## ⏱️ Deployment Time

- **Total Time**: 30-45 minutes
- **What Happens**:
  1. System environment installation (10-15 min)
  2. Database setup (5 min)
  3. Application build (5-10 min)
  4. Nginx configuration (2 min)
  5. SSL setup (5 min)
  6. PM2 startup (2 min)

---

## ✅ Success Indicators

After deployment:

- ✅ **Domain**: https://senorbit.ai
- ✅ **Health**: https://senorbit.ai/health
- ✅ **Ready**: https://senorbit.ai/ready
- ✅ **Live**: https://senorbit.ai/live
- ✅ **No Errors**: Cloudflare Error 521 resolved

---

**Status**: ✅ **Ready to Deploy**  
**Next Action**: Run deployment command  
**Time**: 30-45 minutes

