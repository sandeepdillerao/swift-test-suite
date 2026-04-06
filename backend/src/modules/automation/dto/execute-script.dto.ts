import { IsBoolean, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BrowserType } from '../entities/automation.enums';

export class ExecuteScriptDto {
  @ApiPropertyOptional({ enum: BrowserType }) @IsOptional() @IsEnum(BrowserType) browserType?: BrowserType;
  @ApiPropertyOptional() @IsOptional() @IsString() targetUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableHealing?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() headless?: boolean;
  @ApiPropertyOptional({ description: 'Environment variables to inject into script execution' })
  @IsOptional() @IsObject() variables?: Record<string, string>;
}
