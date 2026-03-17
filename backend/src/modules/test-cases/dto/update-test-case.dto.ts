import { IsArray, IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { JiraSyncStatus, Priority, TestStatus, TestType } from '../entities/test-case.enums';

export class UpdateTestCaseDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 500) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() preconditions?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() suiteId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() assignedTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() steps?: any[];
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
