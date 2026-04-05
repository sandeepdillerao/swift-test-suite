import { IsArray, IsEnum, IsOptional, IsString, IsUUID, Length, ValidateNested } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { JiraSyncStatus, Priority, TestStatus, TestType } from '../entities/test-case.enums';
import { TestStepDto } from './create-test-case.dto';

export class UpdateTestCaseDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 500) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() preconditions?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() suiteId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() assignedTo?: string;
  @ApiPropertyOptional({ type: [TestStepDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TestStepDto) steps?: TestStepDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() expectedResult?: string;
  @ApiPropertyOptional({ enum: Priority }) @IsOptional() @IsEnum(Priority) priority?: Priority;
  @ApiPropertyOptional({ enum: TestType }) @IsOptional() @IsEnum(TestType) type?: TestType;
  @ApiPropertyOptional({ enum: TestStatus }) @IsOptional() @IsEnum(TestStatus) status?: TestStatus;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() jiraTicketId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() jiraTicketUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() jiraSubtaskId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() jiraSubtaskUrl?: string;
  @ApiPropertyOptional({ enum: JiraSyncStatus }) @IsOptional() @IsEnum(JiraSyncStatus) jiraSyncStatus?: JiraSyncStatus;
}
