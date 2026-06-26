import { IsObject, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateSuiteFromRecordingDto {
  @ApiProperty() @IsUUID() projectId: string;

  @ApiPropertyOptional({ description: 'Existing suite to add cases to. If omitted, a new suite is created.' })
  @IsOptional() @IsUUID() targetSuiteId?: string;

  @ApiProperty() @IsString() @Length(1, 255) suiteName: string;

  @ApiPropertyOptional() @IsOptional() @IsString() suiteDescription?: string;

  @ApiProperty({ description: 'Raw Playwright codegen recording script' })
  @IsString() recordedScript: string;

  @ApiPropertyOptional({ description: "Natural-language description of the flow you recorded" })
  @IsOptional() @IsString() flowDescription?: string;

  @ApiPropertyOptional({ description: 'Variables from the selected environment to seed onto the new suite' })
  @IsOptional() @IsObject() suiteVariables?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Environment ID that these variables came from (for reference)' })
  @IsOptional() @IsUUID() environmentId?: string;
}
