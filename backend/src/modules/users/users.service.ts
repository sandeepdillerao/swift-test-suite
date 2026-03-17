import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { FindManyOptions, ILike, Repository } from 'typeorm';
import { generateSecureToken, hashToken } from '@/common/utils/hash.util';
import { getPaginationParams, paginate } from '@/common/utils/pagination.util';
import { Organization } from '@/modules/organizations/entities/organization.entity';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserRoleDto } from './dto/update-user.dto';
import { User, UserRole } from './entities/user.entity';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private orgRepository: Repository<Organization>,
    private configService: ConfigService,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['organization'],
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: ['organization'],
    });
  }

  async findAll(
    organizationId: string,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
    search?: string,
    role?: UserRole,
    isActive?: boolean,
  ) {
    const { skip, take } = getPaginationParams(page, limit);

    const where: FindManyOptions<User>['where'] = [
      ...(search
        ? [
            { organizationId, ...(role ? { role } : {}), ...(isActive !== undefined ? { isActive } : {}), email: ILike(`%${search}%`) },
            { organizationId, ...(role ? { role } : {}), ...(isActive !== undefined ? { isActive } : {}), firstName: ILike(`%${search}%`) },
            { organizationId, ...(role ? { role } : {}), ...(isActive !== undefined ? { isActive } : {}), lastName: ILike(`%${search}%`) },
          ]
        : [{ organizationId, ...(role ? { role } : {}), ...(isActive !== undefined ? { isActive } : {}) }]),
    ];

    const [users, total] = await this.userRepository.findAndCount({
      where,
      skip,
      take,
      order: { [sortBy]: sortOrder },
      relations: ['organization'],
    });

    return paginate(users, total, page, take);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    const updateData: Partial<User> = {
      ...(dto.firstName !== undefined && { firstName: dto.firstName }),
      ...(dto.lastName !== undefined && { lastName: dto.lastName }),
      ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
      ...(dto.settings !== undefined && { settings: dto.settings as Record<string, unknown> }),
    };
    const existing = await this.findById(userId);
    if (!existing) throw new NotFoundException('User not found');
    await this.userRepository.save({ ...existing, ...updateData });
    return this.findById(userId) as Promise<User>;
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'passwordHash'],
    });
    if (!user) throw new NotFoundException('User not found');

    const isValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isValid) throw new BadRequestException('Current password is incorrect');

    const bcryptRounds = this.configService.get<number>('app.bcryptRounds', 12);
    const passwordHash = await bcrypt.hash(dto.newPassword, bcryptRounds);
    await this.userRepository.update(userId, { passwordHash });
  }

  async invite(
    adminUserId: string,
    organizationId: string,
    dto: InviteUserDto,
  ): Promise<User> {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email, organizationId },
    });
    if (existing) {
      throw new ConflictException('User already exists in this organization');
    }

    const inviteToken = generateSecureToken();
    const inviteTokenHash = hashToken(inviteToken);
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const user = this.userRepository.create({
      email: dto.email,
      firstName: dto.firstName || '',
      lastName: dto.lastName || '',
      passwordHash: '',
      role: dto.role,
      organizationId,
      isActive: false,
      isEmailVerified: false,
      invitedBy: adminUserId,
      inviteToken: inviteTokenHash,
      inviteExpiresAt,
    });

    const saved = await this.userRepository.save(user);

    const frontendUrl = this.configService.get<string>('app.frontendUrl');
    this.logger.log(
      `[INVITE] URL for ${dto.email}: ${frontendUrl}/accept-invite?token=${inviteToken}`,
    );

    return this.findById(saved.id) as Promise<User>;
  }

  async acceptInvite(dto: AcceptInviteDto): Promise<void> {
    const tokenHash = hashToken(dto.token);
    const user = await this.userRepository.findOne({
      where: { inviteToken: tokenHash },
    });

    if (!user || !user.inviteExpiresAt || user.inviteExpiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired invite token');
    }

    const bcryptRounds = this.configService.get<number>('app.bcryptRounds', 12);
    const passwordHash = await bcrypt.hash(dto.password, bcryptRounds);

    await this.userRepository.update(user.id, {
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      isActive: true,
      isEmailVerified: true,
      inviteToken: null,
      inviteExpiresAt: null,
    });
  }

  async activate(userId: string): Promise<User> {
    await this.userRepository.update(userId, { isActive: true });
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async deactivate(
    userId: string,
    refreshTokenRepository: Repository<any>,
  ): Promise<User> {
    await this.userRepository.update(userId, { isActive: false });
    await refreshTokenRepository
      .createQueryBuilder()
      .update()
      .set({ revokedAt: new Date() })
      .where('userId = :userId AND revokedAt IS NULL', { userId })
      .execute();
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateRole(
    adminId: string,
    userId: string,
    dto: UpdateUserRoleDto,
  ): Promise<User> {
    if (adminId === userId && dto.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin cannot downgrade their own role');
    }
    await this.userRepository.update(userId, { role: dto.role });
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async softDelete(userId: string): Promise<void> {
    await this.userRepository.softDelete(userId);
  }

  async getOrgStats(organizationId: string) {
    const [totalUsers, activeUsers] = await Promise.all([
      this.userRepository.count({ where: { organizationId } }),
      this.userRepository.count({ where: { organizationId, isActive: true } }),
    ]);

    return {
      totalUsers,
      activeUsers,
      totalProjects: 0,
      totalTestCases: 0,
      totalTestRuns: 0,
    };
  }
}
