# إصلاح السيرفر - طريقة بسيطة
# Server Fix - Simple Method

## 🚀 الطريقة السريعة

### الخطوة 1: افتح Terminal (PowerShell)

### الخطوة 2: اتصل بالسيرفر
```powershell
ssh root@46.224.42.221
```

**عندما يطلب الباسورد، اكتب:**
```
aiadsham
```

### الخطوة 3: انسخ هذا الأمر كامل والصقه

```bash
cd /opt/matrix-platform/server-deployment && chmod +x FIX_NOW.sh && ./FIX_NOW.sh
```

**أو إذا الملف ما موجود، انسخ هذا الأمر كامل:**

```bash
bash << 'EOF'
set -e
echo "🔧 إصلاح شامل - Matrix Platform"
cd /opt/matrix-platform
[ -d ".git" ] && git pull origin master || git pull origin main || true
systemctl start postgresql redis-server nginx 2>/dev/null || true
sudo -u postgres psql << PSQLEOF 2>/dev/null || true
CREATE DATABASE matrix;
CREATE USER matrix WITH ENCRYPTED PASSWORD 'matrix_password_2025';
GRANT ALL PRIVILEGES ON DATABASE matrix TO matrix;
\c matrix
GRANT ALL ON SCHEMA public TO matrix;
CREATE EXTENSION IF NOT EXISTS vector;
\q
PSQLEOF
cd matrix-scaffold/backend
export DATABASE_URL="postgresql://matrix:matrix_password_2025@localhost:5432/matrix"
export REDIS_URL="redis://localhost:6379"
export NODE_ENV="production"
export PORT="3000"
npm ci --production --silent 2>&1 | grep -v "npm WARN" || true
npx prisma generate --silent
npx prisma migrate deploy --silent || true
npm run build --silent
cd /opt/matrix-platform
command -v pm2 || npm install -g pm2
cat > pm2.ecosystem.config.js << 'PM2EOF'
module.exports = {
  apps: [{
    name: 'matrix-platform',
    script: './matrix-scaffold/backend/dist/main.js',
    cwd: '/opt/matrix-platform',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DATABASE_URL: 'postgresql://matrix:matrix_password_2025@localhost:5432/matrix',
      REDIS_URL: 'redis://localhost:6379',
      CORS_ORIGIN: 'https://senorbit.ai,https://www.senorbit.ai'
    },
    autorestart: true,
    max_memory_restart: '2G'
  }]
}
PM2EOF
mkdir -p /var/log/matrix-platform
pm2 delete matrix-platform 2>/dev/null || true
pm2 start pm2.ecosystem.config.js
pm2 save
cat > /etc/nginx/sites-available/senorbit.ai << 'NGINXEOF'
server { listen 80; server_name senorbit.ai www.senorbit.ai; return 301 https://$server_name$request_uri; }
server { listen 443 ssl http2; server_name senorbit.ai www.senorbit.ai; ssl_certificate /etc/letsencrypt/live/senorbit.ai/fullchain.pem; ssl_certificate_key /etc/letsencrypt/live/senorbit.ai/privkey.pem; location / { proxy_pass http://localhost:3000; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; } }
NGINXEOF
ln -sf /etc/nginx/sites-available/senorbit.ai /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
[ ! -f "/etc/letsencrypt/live/senorbit.ai/fullchain.pem" ] && certbot --nginx -d senorbit.ai -d www.senorbit.ai --non-interactive --agree-tos --email admin@senorbit.ai --redirect --quiet 2>/dev/null || true
sleep 5
curl http://localhost:3000/health && echo "✅ Done!"
EOF
```

### الخطوة 4: انتظر 5-10 دقائق

السكريبت راح يستغرق وقت عشان:
- يبني التطبيق
- ينشئ قاعدة البيانات
- يشغل PM2
- يضبط Nginx

### الخطوة 5: تحقق من النتيجة

```bash
curl https://senorbit.ai/health
```

إذا رجع `{"status":"healthy"}` يعني كل شي تمام! ✅

---

## 🆘 إذا ما اشتغل

### تحقق من اللوجات:
```bash
pm2 logs matrix-platform --lines 50
```

### إعادة تشغيل:
```bash
pm2 restart matrix-platform
systemctl restart nginx
```

---

**✅ جاهز! شغّل الأمر على السيرفر!** 🚀
