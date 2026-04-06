import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestRun } from './entities/test-run.entity';
import { TestRunCase } from './entities/test-run-case.entity';
import { TestRunHistory } from './entities/test-run-history.entity';
import { TestCase } from '@/modules/test-cases/entities/test-case.entity';
import { AutomationScript } from '@/modules/automation/entities/automation-script.entity';
import { ScriptExecution } from '@/modules/automation/entities/script-execution.entity';
import { ProjectEnvironment } from '@/modules/projects/entities/project-environment.entity';
import { AutomationModule } from '@/modules/automation/automation.module';
import { ProjectsModule } from '@/modules/projects/projects.module';
import { TestRunsController } from './test-runs.controller';
import { TestRunsService } from './test-runs.service';
import { TestRunExecutionService } from './test-run-execution.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TestRun, TestRunCase, TestRunHistory,
      TestCase, AutomationScript, ScriptExecution, ProjectEnvironment,
    ]),
    forwardRef(() => AutomationModule),
    forwardRef(() => ProjectsModule),
  ],
  controllers: [TestRunsController],
  providers: [TestRunsService, TestRunExecutionService],
  exports: [TestRunsService, TestRunExecutionService],
})
export class TestRunsModule {}
