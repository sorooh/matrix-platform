module.exports = {
  apps: [{
    name: 'matrix-platform',
    script: 'npx',
    args: 'tsx src/main-minimal.ts',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    time: true,
    wait_ready: true,
    listen_timeout: 10000
  }]
}

