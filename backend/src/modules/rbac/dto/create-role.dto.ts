import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, Length, Matches, IsOptional } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'Senior Tester' })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiProperty({ example: 'senior_tester', description: 'Lowercase alphanumeric + underscores' })
  @IsString()
  @Length(1, 100)
  @Matches(/^[a-z][a-z0-9_]*$/, { message: 'slug must be lowercase alphanumeric with underscores, starting with a letter' })
  slug: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;
}
