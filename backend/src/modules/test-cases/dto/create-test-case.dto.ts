import { IsArray, IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Priority, TestType } from '../entities/test-case.enums';

export class CreateTestCaseDto {
  @ApiProperty() @IsString() @Length(1, 500) title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() preconditions?: string;
  @ApiProperty() @IsUUID() projectId: string;
  @ApiProperty() @IsUUID() suiteId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() assignedTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() steps?: any[];
  @ApiProperty() @IsString() expectedResult: string;
  @ApiPropertyOptional({ enum: Priority }) @IsOptional() @IsEnum(Priority) priority?: Priority;
  @ApiPropertyOptional({ enum: TestType }) @IsOptional() @IsEnum(TestType) type?: TestType;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() jiraTicketId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() jiraTicketUrl?: string;
}
