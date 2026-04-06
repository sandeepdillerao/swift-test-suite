import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { ProjectEnvironment } from './entities/project-environment.entity';
import { ProjectMember } from '@/modules/rbac/entities/project-member.entity';
import { ProjectsController } from './projects.controller';
import { EnvironmentsController } from './environments.controller';
import { ProjectsService } from './projects.service';
import { EnvironmentsService } from './environments.service';

@Module({
  imports: [TypeOrmModule.forFeature([Project, ProjectEnvironment, ProjectMember])],
  controllers: [ProjectsController, EnvironmentsController],
  providers: [ProjectsService, EnvironmentsService],
  exports: [ProjectsService, EnvironmentsService],
})
export class ProjectsModule {}
