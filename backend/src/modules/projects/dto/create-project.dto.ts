import { IsBoolean, IsOptional, IsString, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty() @IsString() @Length(1, 255) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty({ example: 'SHOP' })
  @IsString()
  @Length(2, 10)
  @Matches(/^[A-Z0-9]+$/, { message: 'key must be uppercase letters and numbers only' })
  key: string;

  @ApiPropertyOptional({ description: 'Linked Jira project key (e.g. ECOM)' })
  @IsOptional()
  @IsString()
  jiraProjectKey?: string;
}
