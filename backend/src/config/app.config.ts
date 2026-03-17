import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(','),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  swaggerEnabled: process.env.SWAGGER_ENABLED === 'true',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
}));
