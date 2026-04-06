import { IsArray, IsBoolean, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTestRunDto {
  @ApiProperty() @IsString() @Length(1, 255) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsUUID() projectId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() releaseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() assignedTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() environmentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() environment?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() buildNumber?: string;

  @ApiPropertyOptional({ description: 'Array of test case UUIDs (use this OR suiteId)' })
  @IsOptional() @IsArray() @IsUUID(undefined, { each: true })
  testCaseIds?: string[];

  @ApiPropertyOptional({ description: 'Create from suite — auto-detects automation readiness' })
  @IsOptional() @IsUUID()
  suiteId?: string;

  @ApiPropertyOptional({ description: 'Include manual test cases when creating from suite', default: true })
  @IsOptional() @IsBoolean()
  includeManualCases?: boolean;
}
