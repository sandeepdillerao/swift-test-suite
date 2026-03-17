import { IsDateString, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReleaseStatus } from '../entities/release.enums';

export class UpdateReleaseDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 255) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 50) version?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ enum: ReleaseStatus }) @IsOptional() @IsEnum(ReleaseStatus) status?: ReleaseStatus;
  @ApiPropertyOptional() @IsOptional() @IsDateString() plannedDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() releasedDate?: string;
}
