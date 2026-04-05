import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class UpdateRolePermissionsDto {
  @ApiProperty({ example: ['projects:read', 'test_cases:create', 'test_cases:read'] })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}
