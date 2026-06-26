import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { User } from '@/modules/users/entities/user.entity';
import { SettingsService, AiProvider } from './settings.service';
import { UpdateNotificationsDto } from './dto/update-notifications.dto';
import { UpdateOrganizationSettingsDto } from './dto/update-organization-settings.dto';
import { SetApiKeyDto } from './dto/set-api-key.dto';
import { UpdateAiSettingsDto } from './dto/update-ai-settings.dto';
import { UpdatePlaywrightConfigDto } from './dto/update-playwright-config.dto';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all settings for the current user' })
  getAll(@CurrentUser() user: User) {
    return this.service.getAll(user.id);
  }

  @Patch('notifications')
  @ApiOperation({ summary: 'Update notification preferences' })
  updateNotifications(@CurrentUser() user: User, @Body() dto: UpdateNotificationsDto) {
    return this.service.updateNotifications(user.id, dto);
  }

  @Patch('ai')
  @ApiOperation({ summary: 'Update AI provider/model preferences' })
  updateAiSettings(@CurrentUser() user: User, @Body() dto: UpdateAiSettingsDto) {
    return this.service.updateAiSettings(user.id, dto);
  }

  @Patch('playwright')
  @ApiOperation({ summary: 'Update Playwright execution configuration' })
  updatePlaywrightConfig(@CurrentUser() user: User, @Body() dto: UpdatePlaywrightConfigDto) {
    return this.service.updatePlaywrightConfig(user.id, dto);
  }

  @Patch('organization')
  @ApiOperation({ summary: 'Update organization settings (admin/qa_lead only)' })
  updateOrganization(@CurrentUser() user: User, @Body() dto: UpdateOrganizationSettingsDto) {
    return this.service.updateOrganization(user.id, dto);
  }

  @Get('api-keys')
  @ApiOperation({ summary: 'List configured API key providers (no secrets returned)' })
  getApiKeys(@CurrentUser() user: User) {
    return this.service.getApiKeys(user.id);
  }

  @Post('api-keys/:provider')
  @ApiOperation({ summary: 'Store an encrypted API key for a provider' })
  setApiKey(
    @CurrentUser() user: User,
    @Param('provider') provider: string,
    @Body() dto: SetApiKeyDto,
  ) {
    return this.service.setApiKey(user.id, provider as AiProvider, dto);
  }

  @Delete('api-keys/:provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a stored API key' })
  deleteApiKey(@CurrentUser() user: User, @Param('provider') provider: string) {
    return this.service.deleteApiKey(user.id, provider as AiProvider);
  }
}
