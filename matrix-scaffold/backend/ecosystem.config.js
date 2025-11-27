/**
 * PM2 Ecosystem Configuration
 * Professional Production-Ready Auto-Restart Configuration
 */

module.exports = {
  apps: [
    {
      name: 'matrix-platform',
      script: './dist/main.js',
      instances: 'max', // Use all CPU cores
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      merge_logs: true,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      shutdown_with_message: true,
      // Advanced settings
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      // Health monitoring
      health_check_grace_period: 3000,
      // Log rotation
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Performance
      node_args: '--max-old-space-size=4096',
      // Auto restart on file changes (development only)
      ignore_watch: ['node_modules', 'logs', 'dist', '.git']
    }
  ]
}

