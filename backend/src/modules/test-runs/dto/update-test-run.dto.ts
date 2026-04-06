import { IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TestRunStatus } from '../entities/test-run.enums';

export class UpdateTestRunDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 255) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ enum: TestRunStatus }) @IsOptional() @IsEnum(TestRunStatus) status?: TestRunStatus;
  @ApiPropertyOptional() @IsOptional() @IsUUID() assignedTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() environment?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() buildNumber?: string;
}
