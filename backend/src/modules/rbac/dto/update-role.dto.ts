import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'Senior QA' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @ApiPropertyOptional({ description: 'Set as default role for new invites' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
