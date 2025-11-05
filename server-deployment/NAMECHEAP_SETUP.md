# Namecheap Setup Guide - Cloudflare Nameservers
## دليل إعداد Namecheap - Cloudflare Nameservers

**Domain**: senorbit.ai  
**Registrar**: Namecheap  
**Cloudflare Nameservers**: 
- `earl.ns.cloudflare.com`
- `isla.ns.cloudflare.com`

---

## 🔧 Step-by-Step: Update Nameservers at Namecheap

### Step 1: Login to Namecheap

1. Go to: https://www.namecheap.com
2. Click: **Sign In** (top right)
3. Login with your credentials

---

### Step 2: Find Domain Settings

1. After login, go to: **Domain List**
2. Find: `senorbit.ai`
3. Click: **Manage** button next to domain

---

### Step 3: Turn Off DNSSEC

1. In domain settings, find: **Advanced DNS** section
2. Look for: **DNSSEC** or **DNS Security** option
3. **Turn OFF** DNSSEC (if enabled)
   - ⚠️ **Important**: DNSSEC must be OFF before updating nameservers
   - You can re-enable it later through Cloudflare
4. Click: **Save** or **Apply**

---

### Step 4: Update Nameservers

1. In domain settings, find: **Nameservers** section
2. You'll see current nameservers (probably):
   - `ns1.cloudflare.com` (old)
   - `ns2.cloudflare.com` (old)

3. **Change Nameserver Mode**:
   - If using **Namecheap BasicDNS** or **PremiumDNS**
   - Change to: **Custom DNS** or **Nameservers**

4. **Delete Old Nameservers**:
   - Remove: `ns1.cloudflare.com` ❌
   - Remove: `ns2.cloudflare.com` ❌

5. **Add New Cloudflare Nameservers**:
   - Add: `earl.ns.cloudflare.com` ✅
   - Add: `isla.ns.cloudflare.com` ✅

6. **Save Changes**:
   - Click: **Save** or **Update**
   - Wait for confirmation message

---

### Step 5: Verify Changes

1. **Check Nameservers**:
   ```bash
   nslookup -type=NS senorbit.ai
   ```
   Should return:
   - `earl.ns.cloudflare.com`
   - `isla.ns.cloudflare.com`

2. **Check Cloudflare Dashboard**:
   - Go to: https://dash.cloudflare.com
   - Select: `senorbit.ai`
   - Status should change from "Pending" to "Active"

---

## ⏱️ Propagation Time

- **Usually**: 5-30 minutes
- **Can take**: Up to 48 hours
- **Check**: Use `nslookup` command to verify

---

## 📋 Nameserver Configuration

### Old Nameservers (Delete These)
- ❌ `ns1.cloudflare.com`
- ❌ `ns2.cloudflare.com`

### New Cloudflare Nameservers (Add These)
- ✅ `earl.ns.cloudflare.com`
- ✅ `isla.ns.cloudflare.com`

---

## 🆘 Troubleshooting

### Cannot Find Nameserver Settings

**Solution**:
1. Make sure you're in the **Domain List** section
2. Click **Manage** next to `senorbit.ai`
3. Look for **Nameservers** or **Advanced DNS** tab

### DNSSEC Cannot Be Turned Off

**Solution**:
1. Check if DNSSEC is actually enabled
2. If it's already OFF, proceed to nameserver update
3. If it's ON and you can't turn it OFF:
   - Contact Namecheap support
   - Wait 24 hours for DNSSEC to expire
   - Then try again

### Nameservers Not Updating

**Solution**:
1. Double-check nameserver values:
   - `earl.ns.cloudflare.com`
   - `isla.ns.cloudflare.com`
2. Make sure you clicked **Save**
3. Wait 5-30 minutes for propagation
4. Check again with `nslookup`

---

## ✅ Verification Commands

### Check Nameservers
```bash
# Windows
nslookup -type=NS senorbit.ai

# Linux/Mac
dig NS senorbit.ai
host -t NS senorbit.ai
```

**Expected Output**:
```
senorbit.ai nameserver = earl.ns.cloudflare.com
senorbit.ai nameserver = isla.ns.cloudflare.com
```

### Check DNS Resolution
```bash
# Windows
nslookup senorbit.ai

# Linux/Mac
dig senorbit.ai
host senorbit.ai
```

**Expected Output**:
```
senorbit.ai has address 46.224.42.221
```

---

## 📋 Checklist

- [ ] Login to Namecheap
- [ ] Navigate to Domain List
- [ ] Click Manage for senorbit.ai
- [ ] Turn OFF DNSSEC
- [ ] Find Nameservers section
- [ ] Change to Custom DNS mode
- [ ] Delete old nameservers
- [ ] Add new Cloudflare nameservers
- [ ] Save changes
- [ ] Wait 5-30 minutes
- [ ] Verify nameservers (nslookup)
- [ ] Check Cloudflare dashboard (should be Active)
- [ ] Verify DNS resolution

---

**Status**: ⚠️ **Waiting for Nameserver Update**  
**Next Action**: Update nameservers at Namecheap  
**Cloudflare Nameservers**: `earl.ns.cloudflare.com`, `isla.ns.cloudflare.com`

