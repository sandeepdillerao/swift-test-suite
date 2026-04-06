import { IsArray, IsBoolean, IsObject, IsOptional, IsString, IsUrl, Length, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AuthConfigDto {
  @ApiProperty() @IsString() @Length(1, 100) label: string;
  @ApiProperty() @IsString() @Length(1, 255) username: string;
  @ApiProperty() @IsString() @Length(1, 500) password: string;
  @ApiPropertyOptional() @IsOptional() @IsString() role?: string;
}

export class CreateEnvironmentDto {
  @ApiProperty({ example: 'Staging' })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiProperty({ example: 'https://staging.myapp.com' })
  @IsString()
  @Length(1, 500)
  baseUrl: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ type: [AuthConfigDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AuthConfigDto)
  authConfigs?: AuthConfigDto[];

  @ApiPropertyOptional({ example: { API_VERSION: 'v2', TIMEOUT: '30000' } })
  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;
}
