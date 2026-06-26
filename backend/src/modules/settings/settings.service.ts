import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User, UserRole } from '@/modules/users/entities/user.entity';
import { Organization } from '@/modules/organizations/entities/organization.entity';
import { encrypt, decrypt } from '@/common/utils/encryption.util';
import { UpdateNotificationsDto } from './dto/update-notifications.dto';
import { UpdateOrganizationSettingsDto } from './dto/update-organization-settings.dto';
import { SetApiKeyDto } from './dto/set-api-key.dto';
import { UpdateAiSettingsDto } from './dto/update-ai-settings.dto';
import { UpdatePlaywrightConfigDto, PLAYWRIGHT_CONFIG_DEFAULTS } from './dto/update-playwright-config.dto';

export const VALID_PROVIDERS = ['openai', 'anthropic', 'gemini'] as const;
export type AiProvider = typeof VALID_PROVIDERS[number];

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Organization) private orgRepo: Repository<Organization>,
    private configService: ConfigService,
  ) {}

  private get encryptionKey(): string {
    return this.configService.get<string>('SETTINGS_ENCRYPTION_KEY') ?? 'change-me-in-production-32-chars!!';
  }

  async getAll(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId }, relations: ['organization'] });
    if (!user) throw new NotFoundException('User not found');

    const notifications = (user.settings as any)?.notifications ?? {
      emailEnabled: true,
      testRunCompletion: true,
      failedTestAlerts: true,
      mentionAlerts: true,
    };

    const aiSettings = (user.settings as any)?.ai ?? {
      activeProvider: 'gemini',
      activeModel: 'gemini-2.5-flash',
      enabledProviders: { gemini: true, openai: true, anthropic: true },
      autoHealer: false,
    };
    // Ensure enabledProviders always has a default
    if (!aiSettings.enabledProviders) {
      aiSettings.enabledProviders = { gemini: true, openai: true, anthropic: true };
    }
    // Ensure autoHealer defaults to false for existing users who don't have it set
    if (aiSettings.autoHealer === undefined) {
      aiSettings.autoHealer = false;
    }
    // Playwright config — fill in any missing keys with defaults
    const playwrightConfig = {
      ...PLAYWRIGHT_CONFIG_DEFAULTS,
      ...((user.settings as any)?.playwrightConfig ?? {}),
    };

    const encryptedKeys: Record<string, any> = (user.settings as any)?.encryptedApiKeys ?? {};
    const configuredProviders = VALID_PROVIDERS.map(p => ({ provider: p, configured: !!encryptedKeys[p] }));

    return {
      profile: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
      notifications,
      ai: aiSettings,
      playwrightConfig,
      configuredProviders,
      organization: user.organization ? {
        id: user.organization.id,
        name: user.organization.name,
        slug: user.organization.slug,
        website: user.organization.website,
        logoUrl: user.organization.logoUrl,
        description: user.organization.description,
      } : null,
    };
  }

  async updateNotifications(userId: string, dto: UpdateNotificationsDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const currentNotifications = (user.settings as any)?.notifications ?? {};
    const updated = { ...user.settings, notifications: { ...currentNotifications, ...dto } };
    await this.userRepo.save({ ...user, settings: updated });
    return updated.notifications;
  }

  async updateAiSettings(userId: string, dto: UpdateAiSettingsDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const currentAi = (user.settings as any)?.ai ?? {};
    const updated = { ...user.settings, ai: { ...currentAi, ...dto } };
    await this.userRepo.save({ ...user, settings: updated });
    return updated.ai;
  }

  async updateOrganization(userId: string, dto: UpdateOrganizationSettingsDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.QA_LEAD) {
      throw new ForbiddenException('Only admins and QA leads can update organization settings');
    }

    const org = await this.orgRepo.findOne({ where: { id: user.organizationId } });
    if (!org) throw new NotFoundException('Organization not found');

    const updates: Partial<Organization> = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.website !== undefined) updates.website = dto.website;
    if (dto.logoUrl !== undefined) updates.logoUrl = dto.logoUrl;
    if (dto.description !== undefined) updates.description = dto.description;

    await this.orgRepo.save({ ...org, ...updates });
    return this.orgRepo.findOne({ where: { id: org.id } });
  }

  async updatePlaywrightConfig(userId: string, dto: UpdatePlaywrightConfigDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const current = (user.settings as any)?.playwrightConfig ?? {};
    const updated = { ...user.settings, playwrightConfig: { ...current, ...dto } };
    await this.userRepo.save({ ...user, settings: updated });
    return { ...PLAYWRIGHT_CONFIG_DEFAULTS, ...updated.playwrightConfig };
  }

  async setApiKey(userId: string, provider: AiProvider, dto: SetApiKeyDto) {
    if (!VALID_PROVIDERS.includes(provider)) {
      throw new ForbiddenException(`Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}`);
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const encrypted = encrypt(dto.key, this.encryptionKey);
    const currentKeys = (user.settings as any)?.encryptedApiKeys ?? {};
    const updated = { ...user.settings, encryptedApiKeys: { ...currentKeys, [provider]: encrypted } };
    await this.userRepo.save({ ...user, settings: updated });
    return { provider, configured: true };
  }

  async getApiKey(userId: string, provider: AiProvider): Promise<string | null> {
    if (!VALID_PROVIDERS.includes(provider)) return null;
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return null;

    const encryptedKeys = (user.settings as any)?.encryptedApiKeys ?? {};
    const encrypted = encryptedKeys[provider];
    if (!encrypted) return null;

    try {
      return decrypt(encrypted, this.encryptionKey);
    } catch {
      return null;
    }
  }

  async deleteApiKey(userId: string, provider: AiProvider) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const currentKeys = { ...((user.settings as any)?.encryptedApiKeys ?? {}) };
    delete currentKeys[provider];
    const updated = { ...user.settings, encryptedApiKeys: currentKeys };
    await this.userRepo.save({ ...user, settings: updated });
    return { provider, configured: false };
  }

  async getApiKeys(userId: string): Promise<Array<{ provider: string; configured: boolean }>> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const encryptedKeys = (user.settings as any)?.encryptedApiKeys ?? {};
    return VALID_PROVIDERS.map(p => ({ provider: p, configured: !!encryptedKeys[p] }));
  }
}
