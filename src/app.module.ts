import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { AppConfigModule } from './config/config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { EngagementsModule } from './engagements/engagements.module.js';
import { HealthModule } from './health/health.module.js';
import { IntegrationsModule } from './integrations/integrations.module.js';
import { MessagingModule } from './messaging/messaging.module.js';
import { NotesModule } from './notes/notes.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    MessagingModule,
    IntegrationsModule,
    HealthModule,
    NotesModule,
    UsersModule,
    AuthModule,
    EngagementsModule,
  ],
})
export class AppModule {}
