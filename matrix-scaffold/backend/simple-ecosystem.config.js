/**
 * Simple PM2 Configuration for Testing
 */

module.exports = {
  apps: [
    {
      name: 'simple-server',
      script: 'npx',
      args: 'tsx simple-server.ts',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/simple-error.log',
      out_file: './logs/simple-out.log',
      time: true,
      wait_ready: true,
      listen_timeout: 10000
    }
  ]
}

