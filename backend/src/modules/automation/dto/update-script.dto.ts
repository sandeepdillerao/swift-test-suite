import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BrowserType } from '../entities/automation.enums';

export class UpdateScriptDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() activeScript?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() targetUrl?: string;
  @ApiPropertyOptional({ enum: BrowserType }) @IsOptional() @IsEnum(BrowserType) browserType?: BrowserType;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(5) maxHealingAttempts?: number;
}
