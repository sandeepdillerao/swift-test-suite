import { IsUrl, IsEmail, MinLength, IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SaveJiraConfigDto {
  @ApiProperty({ example: 'https://your-domain.atlassian.net' })
  @IsUrl({ require_tld: false })
  baseUrl: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'your-jira-api-token' })
  @IsString()
  @MinLength(10)
  apiToken: string;

  @ApiPropertyOptional({ example: 'PROJ' })
  @IsOptional()
  @IsString()
  defaultProjectKey?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  syncEnabled?: boolean;
}
