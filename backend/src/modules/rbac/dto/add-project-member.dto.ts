import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AddProjectMemberDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Role ID to assign for this project' })
  @IsUUID()
  roleId: string;
}

export class UpdateProjectMemberRoleDto {
  @ApiProperty({ description: 'New role ID for this project member' })
  @IsUUID()
  roleId: string;
}
