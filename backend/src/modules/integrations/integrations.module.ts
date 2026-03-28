import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from '@/modules/organizations/entities/organization.entity';
import { TestCase } from '@/modules/test-cases/entities/test-case.entity';
import { AiAuditLog } from './ai-generation/entities/ai-audit-log.entity';
import { SettingsModule } from '@/modules/settings/settings.module';
import { JiraService } from './jira/jira.service';
import { JiraController } from './jira/jira.controller';
import { AiGenerationService } from './ai-generation/ai-generation.service';
import { AiGenerationController } from './ai-generation/ai-generation.controller';

@Module({
  imports: [
    HttpModule.register({ timeout: 90000 }),
    TypeOrmModule.forFeature([Organization, TestCase, AiAuditLog]),
    SettingsModule,
  ],
  controllers: [JiraController, AiGenerationController],
  providers: [JiraService, AiGenerationService],
  exports: [JiraService],
})
export class IntegrationsModule {}
