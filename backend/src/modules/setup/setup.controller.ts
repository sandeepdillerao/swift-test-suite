import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { Public } from '@/common/decorators/public.decorator';
import { SetupService } from './setup.service';

export class InitializeDto {
  @IsString() @MinLength(1) orgName: string;
  @IsString() @MinLength(1) firstName: string;
  @IsString() @MinLength(1) lastName: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
}

@ApiTags('Setup')
@Controller('setup')
export class SetupController {
  constructor(private readonly setupService: SetupService) {}

  /** Check whether first-time setup is required (no users in DB). */
  @Public()
  @Get('status')
  async status() {
    return this.setupService.getStatus();
  }

  /** Create the first organisation + admin user. Only works on empty databases. */
  @Public()
  @Post('initialize')
  @HttpCode(HttpStatus.CREATED)
  async initialize(@Body() dto: InitializeDto) {
    return this.setupService.initialize(dto);
  }

  /** Load demo data (projects, test cases, etc.). Only works once after initialize. */
  @Public()
  @Post('seed')
  @HttpCode(HttpStatus.CREATED)
  async seed() {
    return this.setupService.seed();
  }
}
