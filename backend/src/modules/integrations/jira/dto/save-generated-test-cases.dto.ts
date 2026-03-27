import { IsUUID, IsString, IsArray, ValidateNested, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Priority, TestType } from '@/modules/test-cases/entities/test-case.enums';

class TestStepDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  order: number;

  @ApiProperty()
  @IsString()
  action: string;

  @ApiProperty()
  @IsString()
  expectedResult: string;
}

class GeneratedTestCaseItemDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preconditions?: string;

  @ApiProperty({ type: [TestStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestStepDto)
  steps: TestStepDto[];

  @ApiProperty()
  @IsString()
  expectedResult: string;

  @ApiPropertyOptional({ enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional({ enum: TestType })
  @IsOptional()
  @IsEnum(TestType)
  type?: TestType;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class SaveGeneratedTestCasesDto {
  @ApiProperty()
  @IsUUID()
  projectId: string;

  @ApiProperty()
  @IsUUID()
  suiteId: string;

  @ApiProperty({ example: 'PROJ-1234' })
  @IsString()
  jiraIssueKey: string;

  @ApiProperty({ type: [GeneratedTestCaseItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GeneratedTestCaseItemDto)
  testCases: GeneratedTestCaseItemDto[];
}
