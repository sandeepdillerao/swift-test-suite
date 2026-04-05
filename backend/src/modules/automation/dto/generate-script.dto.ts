import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BrowserType } from '../entities/automation.enums';

export class GenerateScriptDto {
  @ApiProperty() @IsUUID() testCaseId: string;
  @ApiProperty() @IsUUID() projectId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() targetUrl?: string;
  @ApiPropertyOptional({ enum: BrowserType }) @IsOptional() @IsEnum(BrowserType) browserType?: BrowserType;
  @ApiPropertyOptional({ description: 'Raw Playwright codegen output to enhance with AI' })
  @IsOptional() @IsString() codegenScript?: string;
}

export class ImportCodegenScriptDto {
  @ApiProperty() @IsUUID() testCaseId: string;
  @ApiProperty() @IsUUID() projectId: string;
  @ApiProperty() @IsString() rawScript: string;
  @ApiPropertyOptional() @IsOptional() @IsString() targetUrl?: string;
  @ApiPropertyOptional({ enum: BrowserType }) @IsOptional() @IsEnum(BrowserType) browserType?: BrowserType;
}
