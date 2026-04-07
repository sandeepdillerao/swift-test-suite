import { IsArray, IsEnum, IsObject, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { BrowserType } from '../entities/automation.enums';

class AuthConfigInput {
  @IsString() label: string;
  @IsString() username: string;
  @IsString() password: string;
  @IsOptional() @IsString() role?: string;
}

export class GenerateScriptDto {
  @ApiProperty() @IsUUID() testCaseId: string;
  @ApiProperty() @IsUUID() projectId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() targetUrl?: string;
  @ApiPropertyOptional({ enum: BrowserType }) @IsOptional() @IsEnum(BrowserType) browserType?: BrowserType;
  @ApiPropertyOptional({ description: 'Raw Playwright codegen output to enhance with AI' })
  @IsOptional() @IsString() codegenScript?: string;
  @ApiPropertyOptional({ description: 'Environment variables available during execution' })
  @IsOptional() @IsObject() variables?: Record<string, string>;
  @ApiPropertyOptional({ description: 'Auth configs from the selected environment' })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => AuthConfigInput) authConfigs?: AuthConfigInput[];
}

export class ImportCodegenScriptDto {
  @ApiProperty() @IsUUID() testCaseId: string;
  @ApiProperty() @IsUUID() projectId: string;
  @ApiProperty() @IsString() rawScript: string;
  @ApiPropertyOptional() @IsOptional() @IsString() targetUrl?: string;
  @ApiPropertyOptional({ enum: BrowserType }) @IsOptional() @IsEnum(BrowserType) browserType?: BrowserType;
  @ApiPropertyOptional({ description: 'Environment variables available during execution' })
  @IsOptional() @IsObject() variables?: Record<string, string>;
  @ApiPropertyOptional({ description: 'Auth configs from the selected environment' })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => AuthConfigInput) authConfigs?: AuthConfigInput[];
}
