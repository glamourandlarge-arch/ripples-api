import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { InternalController } from './internal.controller.js';
import { PeerClient } from './peer-client.service.js';
import { ServiceAuthGuard } from './service-auth.guard.js';

@Module({
  controllers: [InternalController],
  providers: [
    PeerClient,
    {
      provide: APP_GUARD,
      useClass: ServiceAuthGuard,
    },
  ],
  exports: [PeerClient],
})
export class IntegrationsModule {}
