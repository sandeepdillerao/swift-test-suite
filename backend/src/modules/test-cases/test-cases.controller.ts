import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { User, UserRole } from '@/modules/users/entities/user.entity';
import { Priority, TestStatus, TestType } from './entities/test-case.enums';
import { CreateTestCaseDto } from './dto/create-test-case.dto';
import { UpdateTestCaseDto } from './dto/update-test-case.dto';
import { TestCasesService } from './test-cases.service';

@ApiTags('Test Cases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('test-cases')
export class TestCasesController {
  constructor(private readonly service: TestCasesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD, UserRole.TESTER)
  @ApiOperation({ summary: 'Create test case' })
  create(@CurrentUser() user: User, @Body() dto: CreateTestCaseDto) {
    return this.service.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List test cases' })
  @ApiQuery({ name: 'projectId', required: false }) @ApiQuery({ name: 'suiteId', required: false })
  @ApiQuery({ name: 'search', required: false }) @ApiQuery({ name: 'status', required: false, enum: TestStatus })
  @ApiQuery({ name: 'priority', required: false, enum: Priority }) @ApiQuery({ name: 'type', required: false, enum: TestType })
  findAll(
    @Query('projectId') projectId?: string, @Query('suiteId') suiteId?: string,
    @Query('search') search?: string, @Query('status') status?: TestStatus,
    @Query('priority') priority?: Priority, @Query('type') type?: TestType,
    @Query('tags') tags?: string, @Query('page') page = 1, @Query('limit') limit = 20,
    @Query('sortBy') sortBy = 'createdAt', @Query('sortOrder') sortOrder: 'ASC' | 'DESC' = 'DESC',
  ) {
    return this.service.findAll({ projectId, suiteId, search, status, priority, type, tags }, +page, +limit, sortBy, sortOrder);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get test case by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD, UserRole.TESTER)
  @ApiOperation({ summary: 'Update test case' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTestCaseDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.QA_LEAD)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete test case (soft)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
