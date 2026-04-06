import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LinkJiraIssueDto {
  @ApiProperty({ example: 'PROJ-1234' })
  @IsString()
  jiraIssueKey: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  createSubtask?: boolean;
}
