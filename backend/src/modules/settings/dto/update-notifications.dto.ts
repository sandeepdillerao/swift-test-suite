import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateNotificationsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() emailEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() testRunCompletion?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() failedTestAlerts?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() mentionAlerts?: boolean;
}
