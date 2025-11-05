// PM2 Ecosystem Configuration - Matrix Platform v11.0.0
// Server: senorbit-core
// Domain: senorbit.ai

module.exports = {
  apps: [
    {
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
        VERSION: '11.0.0',
        CORS_ORIGIN: 'https://senorbit.ai,https://www.senorbit.ai',
        LOG_LEVEL: 'info'
      },
      error_file: '/var/log/matrix-platform/error.log',
      out_file: '/var/log/matrix-platform/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      watch: false,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    }
  ]
}

