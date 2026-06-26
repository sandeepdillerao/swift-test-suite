import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { AutomationScript } from './entities/automation-script.entity';
import { ScriptExecution } from './entities/script-execution.entity';
import { TestCase } from '@/modules/test-cases/entities/test-case.entity';
import { TestSuite } from '@/modules/test-suites/entities/test-suite.entity';
import { User } from '@/modules/users/entities/user.entity';
import { Project } from '@/modules/projects/entities/project.entity';
import { SettingsModule } from '@/modules/settings/settings.module';
import { ProjectsModule } from '@/modules/projects/projects.module';
import { AutomationService } from './automation.service';
import { AutomationController } from './automation.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AutomationScript, ScriptExecution, TestCase, TestSuite, User, Project]),
    HttpModule,
    SettingsModule,
    ProjectsModule,
  ],
  controllers: [AutomationController],
  providers: [AutomationService],
  exports: [AutomationService],
})
export class AutomationModule {}
