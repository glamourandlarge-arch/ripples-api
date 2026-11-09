import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Internal } from '../utils/decorators/internal.decorator.js';

@Controller('internal')
export class InternalController {
  constructor(private readonly config: ConfigService) {}

  @Get('ping')
  @Internal()
  ping() {
    return {
      message: 'Internal ping succeeded',
      data: {
        ok: true,
        service: this.config.getOrThrow<string>('SERVICE_NAME'),
      },
    };
  }
}
