import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestCase } from '@/modules/test-cases/entities/test-case.entity';
import { TestRun } from '@/modules/test-runs/entities/test-run.entity';
import { Project } from '@/modules/projects/entities/project.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([TestCase, TestRun, Project])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
