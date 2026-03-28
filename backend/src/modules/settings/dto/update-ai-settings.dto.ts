import { IsOptional, IsString, IsObject, IsBoolean } from 'class-validator';
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
}
