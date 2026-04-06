import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetApiKeyDto {
  @ApiProperty({ description: 'The API key to encrypt and store' })
  @IsString() @MinLength(10) key: string;
}
