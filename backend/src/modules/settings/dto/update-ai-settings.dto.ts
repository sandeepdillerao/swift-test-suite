import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAiSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() activeProvider?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() activeModel?: string;
}
