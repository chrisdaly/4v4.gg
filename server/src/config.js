const config = {
  PORT: parseInt(process.env.PORT || '3002', 10),
  ADMIN_API_KEY: process.env.ADMIN_API_KEY || '',
  DB_PATH: process.env.DB_PATH || './data/chat.db',
  CORS_ORIGINS: (process.env.CORS_ORIGINS || 'https://4v4.gg,http://localhost:3001').split(','),
  BOT_ENABLED: process.env.BOT_ENABLED === 'true',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
};

export default config;
