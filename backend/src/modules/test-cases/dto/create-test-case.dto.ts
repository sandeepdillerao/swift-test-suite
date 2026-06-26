import { IsArray, IsEnum, IsNumber, IsObject, IsOptional, IsString, IsUUID, Length, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Priority, TestType } from '../entities/test-case.enums';

export class TestStepDto {
  @ApiProperty() @IsString() id: string;
  @ApiProperty() @IsNumber() @Type(() => Number) order: number;
  @ApiProperty() @IsString() action: string;
  @ApiProperty() @IsString() expectedResult: string;
}

export class CreateTestCaseDto {
  @ApiProperty() @IsString() @Length(1, 500) title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() preconditions?: string;
  @ApiProperty() @IsUUID() projectId: string;
  @ApiProperty() @IsUUID() suiteId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() assignedTo?: string;
  @ApiPropertyOptional({ type: [TestStepDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TestStepDto) steps?: TestStepDto[];
  @ApiProperty() @IsString() expectedResult: string;
  @ApiPropertyOptional({ enum: Priority }) @IsOptional() @IsEnum(Priority) priority?: Priority;
  @ApiPropertyOptional({ enum: TestType }) @IsOptional() @IsEnum(TestType) type?: TestType;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() jiraTicketId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() jiraTicketUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() variables?: Record<string, string>;
}
