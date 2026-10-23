import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Internal } from '../common/decorators/internal.decorator.js';

@Controller('internal')
export class InternalController {
  constructor(private readonly config: ConfigService) {}

  @Get('ping')
  @Internal()
  ping() {
    return {
      ok: true,
      service: this.config.getOrThrow<string>('SERVICE_NAME'),
    };
  }
}
