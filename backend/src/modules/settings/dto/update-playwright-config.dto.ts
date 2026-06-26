import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePlaywrightConfigDto {
  // ── Timeouts ──────────────────────────────────────────────────────────────
  @ApiPropertyOptional({ description: 'Per-test timeout in ms (0 = no limit)', minimum: 0 })
  @IsOptional() @IsInt() @Min(0) testTimeout?: number;

  @ApiPropertyOptional({ description: 'Per-action timeout in ms (0 = Playwright default)', minimum: 0 })
  @IsOptional() @IsInt() @Min(0) actionTimeout?: number;

  @ApiPropertyOptional({ description: 'Navigation timeout in ms (0 = Playwright default)', minimum: 0 })
  @IsOptional() @IsInt() @Min(0) navigationTimeout?: number;

  // ── Execution ─────────────────────────────────────────────────────────────
  @ApiPropertyOptional({ description: 'Number of retries on failure', minimum: 0, maximum: 5 })
  @IsOptional() @IsInt() @Min(0) @Max(5) retries?: number;

  @ApiPropertyOptional({ description: 'Number of parallel workers', minimum: 1, maximum: 8 })
  @IsOptional() @IsInt() @Min(1) @Max(8) workers?: number;

  @ApiPropertyOptional({ description: 'Run browser in headless mode by default' })
  @IsOptional() @IsBoolean() defaultHeadless?: boolean;

  @ApiPropertyOptional({ description: 'Default browser engine', enum: ['chromium', 'firefox', 'webkit'] })
  @IsOptional() @IsIn(['chromium', 'firefox', 'webkit']) defaultBrowser?: string;

  // ── Viewport ──────────────────────────────────────────────────────────────
  @ApiPropertyOptional({ description: 'Default viewport width in pixels', minimum: 320 })
  @IsOptional() @IsInt() @Min(320) viewportWidth?: number;

  @ApiPropertyOptional({ description: 'Default viewport height in pixels', minimum: 240 })
  @IsOptional() @IsInt() @Min(240) viewportHeight?: number;

  // ── Artifacts ─────────────────────────────────────────────────────────────
  @ApiPropertyOptional({ enum: ['always', 'on-failure', 'never'] })
  @IsOptional() @IsIn(['always', 'on-failure', 'never']) screenshot?: string;

  @ApiPropertyOptional({ enum: ['always', 'on-failure', 'never'] })
  @IsOptional() @IsIn(['always', 'on-failure', 'never']) video?: string;

  @ApiPropertyOptional({ enum: ['always', 'on-failure', 'never'] })
  @IsOptional() @IsIn(['always', 'on-failure', 'never']) trace?: string;

  // ── Misc ──────────────────────────────────────────────────────────────────
  @ApiPropertyOptional({ description: 'Slow down each action by this many ms (useful for debugging)', minimum: 0 })
  @IsOptional() @IsInt() @Min(0) slowMo?: number;

  @ApiPropertyOptional({ description: 'Ignore HTTPS certificate errors' })
  @IsOptional() @IsBoolean() ignoreHttpsErrors?: boolean;
}

export const PLAYWRIGHT_CONFIG_DEFAULTS: Required<UpdatePlaywrightConfigDto> = {
  testTimeout: 120000,
  actionTimeout: 0,
  navigationTimeout: 0,
  retries: 0,
  workers: 1,
  defaultHeadless: true,
  defaultBrowser: 'chromium',
  viewportWidth: 1280,
  viewportHeight: 720,
  screenshot: 'on-failure',
  video: 'on-failure',
  trace: 'on-failure',
  slowMo: 0,
  ignoreHttpsErrors: false,
};
