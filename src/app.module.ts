import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { IntegrationsModule } from './integrations/integrations.module.js';
import { MessagingModule } from './messaging/messaging.module.js';
import { NotesModule } from './notes/notes.module.js';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    MessagingModule,
    IntegrationsModule,
    HealthModule,
    NotesModule,
  ],
})
export class AppModule {}
