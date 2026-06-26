import { IsOptional, IsString, IsObject, IsBoolean, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class EnabledProvidersDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() gemini?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() openai?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() anthropic?: boolean;
}

export class UpdateAiSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() activeProvider?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() activeModel?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  @Type(() => EnabledProvidersDto)
  enabledProviders?: EnabledProvidersDto;

  @ApiPropertyOptional({ description: 'Auto-heal failed Playwright scripts using AI. Off by default.' })
  @IsOptional() @IsBoolean() autoHealer?: boolean;

  @ApiPropertyOptional({ description: 'When to capture screenshots/video/trace', enum: ['always', 'on-failure', 'never'] })
  @IsOptional() @IsIn(['always', 'on-failure', 'never']) captureArtifacts?: 'always' | 'on-failure' | 'never';
}
