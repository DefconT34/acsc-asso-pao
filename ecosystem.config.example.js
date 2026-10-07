// ACSC v8.6 — PM2 local / VPS (o2switch cPanel utilise Passenger via server.o2switch.js shim)
module.exports = {
  apps: [{
    name: 'acsc-asso-pao',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    env: { NODE_ENV: 'production', PORT: 3000, DB_PATH: './database.db', ALLOWED_ORIGINS: 'https://acsc-asso-pao.com,https://www.acsc-asso-pao.com,http://localhost:3000', ELEVEN_API_KEY: '' }
  }]
};
