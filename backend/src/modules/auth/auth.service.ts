import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { generateSecureToken, hashToken, slugify } from '@/common/utils/hash.util';
import { Organization } from '@/modules/organizations/entities/organization.entity';
import { User, UserRole } from '@/modules/users/entities/user.entity';
import { UsersService } from '@/modules/users/users.service';
import { RbacService } from '@/modules/rbac/rbac.service';
import { RegisterDto } from './dto/register.dto';
import { InitSystemDto } from './dto/init-system.dto';
import { RefreshToken } from './entities/refresh-token.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private orgRepository: Repository<Organization>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private usersService: UsersService,
    private rbacService: RbacService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { email },
      select: [
        'id', 'email', 'passwordHash', 'role', 'roleId', 'isActive',
        'isEmailVerified', 'organizationId', 'firstName', 'lastName',
        'avatarUrl', 'lastLoginAt', 'settings', 'createdAt', 'updatedAt',
      ],
    });

    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return null;

    return user;
  }

  async register(dto: RegisterDto, _ip?: string) {
    const existing = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const bcryptRounds = this.configService.get<number>('app.bcryptRounds', 12);
    const passwordHash = await bcrypt.hash(dto.password, bcryptRounds);

    let organization: Organization;
    let role: UserRole;

    if (dto.organizationName) {
      const slug = slugify(dto.organizationName);
      const existingOrg = await this.orgRepository.findOne({ where: { slug } });
      if (existingOrg) {
        throw new ConflictException('Organization name already taken');
      }
      organization = this.orgRepository.create({
        name: dto.organizationName,
        slug,
      });
      organization = await this.orgRepository.save(organization);
      role = UserRole.ADMIN;

      // Seed default RBAC roles for the new organization
      await this.rbacService.seedDefaultRolesForOrg(organization.id);
    } else if (dto.inviteToken) {
      const tokenHash = hashToken(dto.inviteToken);
      const invitedUser = await this.userRepository.findOne({
        where: { inviteToken: tokenHash },
      });
      if (!invitedUser || !invitedUser.inviteExpiresAt || invitedUser.inviteExpiresAt < new Date()) {
        throw new BadRequestException('Invalid or expired invite token');
      }
      // Update the invited user record instead of creating new
      const updatedUser = await this.userRepository.save({
        ...invitedUser,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        isActive: true,
        isEmailVerified: true,
        inviteToken: null,
        inviteExpiresAt: null,
      });
      return { message: 'Account created successfully', userId: updatedUser.id };
    } else {
      throw new BadRequestException('Either organizationName or inviteToken is required');
    }

    const verificationToken = generateSecureToken();
    const verificationTokenHash = hashToken(verificationToken);

    // Resolve the RBAC roleId from the legacy enum
    const rbacRole = await this.rbacService.findRoleBySlug(organization.id, role);

    const user = this.userRepository.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      organizationId: organization.id,
      role,
      roleId: rbacRole?.id ?? null,
      isActive: false,
      isEmailVerified: false,
      inviteToken: verificationTokenHash,
    });

    await this.userRepository.save(user);

    this.logger.log(
      `[EMAIL VERIFICATION] Token for ${dto.email}: ${verificationToken}`,
    );

    return { message: 'Verification email sent' };
  }

  async login(user: User, userAgent?: string, ipAddress?: string) {
    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Please verify your email first');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const tokens = await this.generateTokenPair(user, userAgent, ipAddress);

    await this.userRepository.update(user.id, { lastLoginAt: new Date() });

    const fullUser = await this.usersService.findById(user.id);
    return { ...tokens, user: fullUser };
  }

  async refresh(refreshToken: string, userAgent?: string, ipAddress?: string) {
    let payload: { sub: string; type: string; jti: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const tokenHash = hashToken(refreshToken);
    const stored = await this.refreshTokenRepository.findOne({
      where: { tokenHash, userId: payload.sub },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    // Revoke old token
    await this.refreshTokenRepository.update(stored.id, { revokedAt: new Date() });

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return this.generateTokenPair(user, userAgent, ipAddress);
  }

  async logout(userId: string, refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    await this.refreshTokenRepository.update(
      { userId, tokenHash },
      { revokedAt: new Date() },
    );
  }

  async logoutAll(userId: string) {
    await this.refreshTokenRepository
      .createQueryBuilder()
      .update()
      .set({ revokedAt: new Date() })
      .where('userId = :userId AND revokedAt IS NULL', { userId })
      .execute();
  }

  async forgotPassword(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      return { message: 'If email exists, reset link sent' };
    }

    const resetToken = generateSecureToken();
    const resetTokenHash = hashToken(resetToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.userRepository.update(user.id, {
      passwordResetToken: resetTokenHash,
      passwordResetExpiresAt: expiresAt,
    });

    const frontendUrl = this.configService.get<string>('app.frontendUrl');
    this.logger.log(
      `[PASSWORD RESET] URL for ${email}: ${frontendUrl}/reset-password?token=${resetToken}`,
    );

    return { message: 'If email exists, reset link sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = hashToken(token);
    const user = await this.userRepository.findOne({
      where: { passwordResetToken: tokenHash },
    });

    if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const bcryptRounds = this.configService.get<number>('app.bcryptRounds', 12);
    const passwordHash = await bcrypt.hash(newPassword, bcryptRounds);

    await this.userRepository.update(user.id, {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    });
  }

  async getSetupStatus(): Promise<{ isInitialized: boolean }> {
    const count = await this.userRepository.count();
    return { isInitialized: count > 0 };
  }

  async initializeSystem(dto: InitSystemDto, userAgent?: string, ipAddress?: string) {
    const count = await this.userRepository.count();
    if (count > 0) {
      throw new ConflictException('System is already initialized');
    }

    const bcryptRounds = this.configService.get<number>('app.bcryptRounds', 12);
    const passwordHash = await bcrypt.hash(dto.password, bcryptRounds);

    const slug = slugify(dto.organizationName);
    let organization = this.orgRepository.create({ name: dto.organizationName, slug });
    organization = await this.orgRepository.save(organization);

    await this.rbacService.seedDefaultRolesForOrg(organization.id);

    const rbacRole = await this.rbacService.findRoleBySlug(organization.id, UserRole.ADMIN);

    const user = this.userRepository.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      organizationId: organization.id,
      role: UserRole.ADMIN,
      roleId: rbacRole?.id ?? null,
      isActive: true,
      isEmailVerified: true,
    });

    const savedUser = await this.userRepository.save(user);
    this.logger.log(`System initialized by first admin: ${dto.email}`);

    const tokens = await this.generateTokenPair(savedUser, userAgent, ipAddress);
    const fullUser = await this.usersService.findById(savedUser.id);
    return { ...tokens, user: fullUser };
  }

  async verifyEmail(token: string) {
    const tokenHash = hashToken(token);
    const user = await this.userRepository.findOne({
      where: { inviteToken: tokenHash },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    await this.userRepository.update(user.id, {
      isEmailVerified: true,
      isActive: true,
      inviteToken: null,
    });
  }

  private async generateTokenPair(
    user: User,
    userAgent?: string,
    ipAddress?: string,
  ) {
    const jti = uuidv4();

    const accessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      roleId: user.roleId || null,
      orgId: user.organizationId,
      type: 'access',
    };

    const refreshPayload = {
      sub: user.id,
      type: 'refresh',
      jti,
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: this.configService.get<string>('jwt.accessExpiry', '15m'),
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: this.configService.get<string>('jwt.refreshExpiry', '7d'),
    });

    const refreshExpiry = this.configService.get<string>('jwt.refreshExpiry', '7d');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // default 7d

    const tokenHash = hashToken(refreshToken);
    await this.refreshTokenRepository.save({
      userId: user.id,
      tokenHash,
      userAgent: userAgent || null,
      ipAddress: ipAddress || null,
      expiresAt,
    });

    return { accessToken, refreshToken };
  }
}
