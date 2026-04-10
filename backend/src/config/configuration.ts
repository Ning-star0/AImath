export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3001),
  apiPrefix: process.env.API_PREFIX ?? 'api/v1',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  frontendUrls: process.env.FRONTEND_URLS ?? '',
  databaseUrl: process.env.DATABASE_URL ?? '',
  redisUrl: process.env.REDIS_URL ?? '',
  jwtSecret: process.env.JWT_SECRET ?? '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  openai: {
    baseUrl: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
    apiKey: process.env.OPENAI_API_KEY ?? '',
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    visionBaseUrl:
      process.env.OPENAI_VISION_BASE_URL ??
      process.env.OPENAI_BASE_URL ??
      'https://api.openai.com/v1',
    visionApiKey: process.env.OPENAI_VISION_API_KEY ?? process.env.OPENAI_API_KEY ?? '',
    visionModel: process.env.OPENAI_VISION_MODEL ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  },
});
