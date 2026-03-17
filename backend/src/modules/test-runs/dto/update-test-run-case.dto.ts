import { IsArray, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TestStatus } from '@/modules/test-cases/entities/test-case.enums';

export class UpdateTestRunCaseDto {
  @ApiPropertyOptional({ enum: TestStatus }) @IsEnum(TestStatus) status: TestStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() comment?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() actualResult?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) duration?: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) defects?: string[];
}
