import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateFromJiraDto {
  @ApiProperty({ example: 'PROJ-1234' })
  @IsString()
  jiraIssueKey: string;
}
