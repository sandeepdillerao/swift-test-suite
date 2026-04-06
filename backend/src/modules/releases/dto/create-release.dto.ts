import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReleaseStatus } from '../entities/release.enums';

export class CreateReleaseDto {
  @ApiProperty() @IsString() @Length(1, 255) name: string;
  @ApiProperty() @IsString() @Length(1, 50) version: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsUUID() projectId: string;
  @ApiPropertyOptional({ enum: ReleaseStatus }) @IsOptional() @IsEnum(ReleaseStatus) status?: ReleaseStatus;
  @ApiPropertyOptional() @IsOptional() @IsDateString() plannedDate?: string;
}
