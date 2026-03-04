module.exports = {
  apps: [
    {
      name: 'eatsmart-backend',
      cwd: '/root/EatSmart/backend',
      script: 'uvicorn',
      args: 'main:app --host 0.0.0.0 --port 8000',
      interpreter: 'python3',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/root/.pm2/logs/eatsmart-backend-error.log',
      out_file: '/root/.pm2/logs/eatsmart-backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    },
    {
      name: 'eatsmart-frontend',
      cwd: '/root/EatSmart/frontend',
      script: 'npm',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/root/.pm2/logs/eatsmart-frontend-error.log',
      out_file: '/root/.pm2/logs/eatsmart-frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
};
