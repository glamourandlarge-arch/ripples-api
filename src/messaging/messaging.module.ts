import { Module } from '@nestjs/common';
import { MessagingClient } from './messaging.client.js';

@Module({
  providers: [MessagingClient],
  exports: [MessagingClient],
})
export class MessagingModule {}
