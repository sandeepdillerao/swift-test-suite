import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { AutomationScript } from './entities/automation-script.entity';
import { ScriptExecution } from './entities/script-execution.entity';
import { TestCase } from '@/modules/test-cases/entities/test-case.entity';
import { SettingsModule } from '@/modules/settings/settings.module';
import { AutomationService } from './automation.service';
import { AutomationController } from './automation.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AutomationScript, ScriptExecution, TestCase]),
    HttpModule,
    SettingsModule,
  ],
  controllers: [AutomationController],
  providers: [AutomationService],
  exports: [AutomationService],
})
export class AutomationModule {}
