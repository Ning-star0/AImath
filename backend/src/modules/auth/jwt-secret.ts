import { ConfigService } from '@nestjs/config';

const PLACEHOLDER_SECRETS = new Set([
  'replace-with-strong-secret',
  'change-this-to-a-strong-secret',
]);

export function resolveJwtSecret(configService: ConfigService) {
  const configuredSecret = configService.get<string>('jwtSecret')?.trim();
  const nodeEnv = configService.get<string>('nodeEnv', 'development');

  if (configuredSecret && !PLACEHOLDER_SECRETS.has(configuredSecret)) {
    return configuredSecret;
  }

  if (nodeEnv === 'production') {
    throw new Error('JWT_SECRET must be configured with a strong non-placeholder value in production.');
  }

  return 'dev-only-ai-math-jwt-secret';
}
