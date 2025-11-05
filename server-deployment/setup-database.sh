#!/bin/bash
# Database Setup Script - Matrix Platform v11.0.0

set -e

echo "🗄️ Setting up PostgreSQL database for Matrix Platform..."

# Create database and user
sudo -u postgres psql << EOF
-- Create database
CREATE DATABASE matrix;

-- Create user
CREATE USER matrix WITH ENCRYPTED PASSWORD 'matrix_password_2025';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE matrix TO matrix;

-- Connect to database and grant schema privileges
\c matrix
GRANT ALL ON SCHEMA public TO matrix;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO matrix;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO matrix;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO matrix;

\q
EOF

# Enable pgvector extension
echo "📦 Enabling pgvector extension..."
sudo -u postgres psql -d matrix << EOF
CREATE EXTENSION IF NOT EXISTS vector;
\q
EOF

# Update PostgreSQL configuration
echo "⚙️ Updating PostgreSQL configuration..."
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" /etc/postgresql/*/main/postgresql.conf
systemctl restart postgresql

# Run migrations
echo "🗄️ Running database migrations..."
cd /opt/matrix-platform/matrix-scaffold/backend
export DATABASE_URL="postgresql://matrix:matrix_password_2025@localhost:5432/matrix"
npx prisma migrate deploy

echo "✅ Database setup complete!"

