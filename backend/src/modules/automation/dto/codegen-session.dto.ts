import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BrowserType } from '../entities/automation.enums';

export class StartCodegenDto {
  @ApiPropertyOptional({ description: 'Omit when recording for suite generation (not linked to a test case)' })
  @IsOptional() @IsUUID() testCaseId?: string;
  @ApiProperty() @IsUUID() projectId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() targetUrl?: string;
  @ApiPropertyOptional({ enum: BrowserType }) @IsOptional() @IsEnum(BrowserType) browserType?: BrowserType;
}
