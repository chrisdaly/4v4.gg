const config = {
  PORT: parseInt(process.env.PORT || '3002', 10),
  ADMIN_API_KEY: process.env.ADMIN_API_KEY || '',
  DB_PATH: process.env.DB_PATH || './data/chat.db',
  CORS_ORIGINS: (process.env.CORS_ORIGINS || 'https://4v4.gg,http://localhost:3000,http://localhost:3001').split(','),
  BOT_ENABLED: process.env.BOT_ENABLED === 'true',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID || '',
  TWITCH_CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET || '',
  // Replicate (for FLUX image generation)
  REPLICATE_API_TOKEN: process.env.REPLICATE_API_TOKEN || '',
  // GitHub (for feedback issue creation)
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
  GITHUB_REPO: process.env.GITHUB_REPO || 'chrisdaly/4v4-gg',
};

export default config;
