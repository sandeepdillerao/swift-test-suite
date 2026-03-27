import { IsOptional, IsString, IsIn, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SearchJiraIssuesDto {
  @ApiPropertyOptional({ example: 'PROJ' })
  @IsOptional()
  @IsString()
  projectKey?: string;

  @ApiPropertyOptional({ example: 'login bug' })
  @IsOptional()
  @IsString()
  searchText?: string;

  @ApiPropertyOptional({ enum: ['story', 'task', 'bug', 'epic'] })
  @IsOptional()
  @IsIn(['story', 'task', 'bug', 'epic'])
  issueType?: 'story' | 'task' | 'bug' | 'epic';

  @ApiPropertyOptional({ example: 'To Do' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}
