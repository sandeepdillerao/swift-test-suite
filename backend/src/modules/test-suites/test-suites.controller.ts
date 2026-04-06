import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { User, UserRole } from '@/modules/users/entities/user.entity';
import { CreateTestSuiteDto } from './dto/create-test-suite.dto';
import { UpdateTestSuiteDto } from './dto/update-test-suite.dto';
import { TestSuitesService } from './test-suites.service';

@ApiTags('Test Suites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('test-suites')
export class TestSuitesController {
  constructor(private readonly service: TestSuitesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD, UserRole.TESTER)
  @ApiOperation({ summary: 'Create test suite' })
  create(@CurrentUser() user: User, @Body() dto: CreateTestSuiteDto) {
    return this.service.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List test suites by project' })
  findAll(@Query('projectId') projectId: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.service.findAll(projectId, +page, +limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get test suite by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD, UserRole.TESTER)
  @ApiOperation({ summary: 'Update test suite' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTestSuiteDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete test suite (soft)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
