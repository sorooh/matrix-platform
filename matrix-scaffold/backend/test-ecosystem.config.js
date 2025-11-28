/**
 * PM2 Test Configuration
 * Simple test to verify PM2 works
 */

module.exports = {
  apps: [
    {
      name: 'test-server',
      script: 'npx',
      args: 'tsx test-startup.ts',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/test-error.log',
      out_file: './logs/test-out.log',
      time: true,
      wait_ready: true,
      listen_timeout: 10000
    }
  ]
}

