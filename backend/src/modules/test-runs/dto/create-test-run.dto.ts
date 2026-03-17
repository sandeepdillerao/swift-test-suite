import { IsArray, IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TestRunStatus } from '../entities/test-run.enums';

export class CreateTestRunDto {
  @ApiProperty() @IsString() @Length(1, 255) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsUUID() projectId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() releaseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() assignedTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() environment?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() buildNumber?: string;
  @ApiProperty({ description: 'Array of test case UUIDs to include' })
  @IsArray() @IsUUID(undefined, { each: true }) testCaseIds: string[];
}
