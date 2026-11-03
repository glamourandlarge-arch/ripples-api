import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';

export const configureTrustProxy = (
  app: NestExpressApplication,
  configService: ConfigService,
): void => {
  const value = configService.get<string>('HTTP_TRUST_PROXY');
  if (!value || value === 'false') {
    return;
  }

  if (value === 'true') {
    app.set('trust proxy', true);

    return;
  }

  if (/^\d+$/.test(value)) {
    app.set('trust proxy', Number(value));

    return;
  }

  app.set(
    'trust proxy',
    value.split(',').map((segment) => segment.trim()),
  );
};
