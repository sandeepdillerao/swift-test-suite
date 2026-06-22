import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SetupController } from './setup.controller';
import { SetupService } from './setup.service';
import { User } from '../users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { Project } from '../projects/entities/project.entity';
import { TestSuite } from '../test-suites/entities/test-suite.entity';
import { TestCase } from '../test-cases/entities/test-case.entity';
import { Release } from '../releases/entities/release.entity';
import { TestRun } from '../test-runs/entities/test-run.entity';
import { TestRunCase } from '../test-runs/entities/test-run-case.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User, Organization, Project, TestSuite, TestCase,
      Release, TestRun, TestRunCase,
    ]),
  ],
  controllers: [SetupController],
  providers: [SetupService],
})
export class SetupModule {}
