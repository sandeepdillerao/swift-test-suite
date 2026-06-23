import { IsEmail, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitSystemDto {
  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  @Length(1, 255)
  organizationName: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @Length(1, 100)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @Length(1, 100)
  lastName: string;

  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass1!' })
  @IsString()
  @Length(8, 100)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password: string;
}
