#!/bin/bash
# Fix missing files on server
# This ensures all files are pulled from GitHub

set -e

echo "🔧 إصلاح الملفات الناقصة"
echo "=========================="

cd /opt/matrix-platform

# Force pull all files
echo "📥 Pulling all files from GitHub..."
git fetch origin
git reset --hard origin/master 2>/dev/null || git reset --hard origin/main 2>/dev/null || true

# Verify Prisma schema exists
if [ ! -f "matrix-scaffold/backend/prisma/schema.prisma" ]; then
    echo "❌ Prisma schema still missing!"
    echo "   Trying to restore from git..."
    git checkout HEAD -- matrix-scaffold/backend/prisma/schema.prisma 2>/dev/null || {
        echo "❌ Cannot restore Prisma schema!"
        echo "   Please check GitHub repository"
        exit 1
    }
fi

echo "✅ Files verified"
