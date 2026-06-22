import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { Project } from '../projects/entities/project.entity';
import { TestSuite } from '../test-suites/entities/test-suite.entity';
import { TestCase } from '../test-cases/entities/test-case.entity';
import { Priority, TestStatus, TestType } from '../test-cases/entities/test-case.enums';
import { Release } from '../releases/entities/release.entity';
import { ReleaseStatus } from '../releases/entities/release.enums';
import { TestRun } from '../test-runs/entities/test-run.entity';
import { TestRunStatus } from '../test-runs/entities/test-run.enums';
import { TestRunCase } from '../test-runs/entities/test-run-case.entity';
import type { InitializeDto } from './setup.controller';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class SetupService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Organization) private readonly orgRepo: Repository<Organization>,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectRepository(TestSuite) private readonly suiteRepo: Repository<TestSuite>,
    @InjectRepository(TestCase) private readonly tcRepo: Repository<TestCase>,
    @InjectRepository(Release) private readonly releaseRepo: Repository<Release>,
    @InjectRepository(TestRun) private readonly runRepo: Repository<TestRun>,
    @InjectRepository(TestRunCase) private readonly runCaseRepo: Repository<TestRunCase>,
    private readonly dataSource: DataSource,
  ) {}

  async getStatus() {
    const count = await this.userRepo.count();
    return { requiresSetup: count === 0 };
  }

  async initialize(dto: InitializeDto) {
    const count = await this.userRepo.count();
    if (count > 0) {
      throw new BadRequestException('Setup already completed. An admin account already exists.');
    }

    // Create organisation
    const slug = dto.orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const org = await this.orgRepo.save(
      this.orgRepo.create({
        name: dto.orgName,
        slug: slug || 'my-org',
        description: `${dto.orgName} workspace`,
        isActive: true,
      }),
    );

    // Create admin user
    const user = await this.userRepo.save(
      this.userRepo.create({
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
        role: UserRole.ADMIN,
        organizationId: org.id,
        isActive: true,
        isEmailVerified: true,
      }),
    );

    return {
      message: 'Setup complete. You can now log in.',
      email: user.email,
      organization: org.name,
    };
  }

  async seed() {
    const count = await this.userRepo.count();
    if (count === 0) {
      throw new BadRequestException('Run /setup/initialize first to create an admin account.');
    }

    // Find the existing admin
    const admin = await this.userRepo.findOne({ where: { role: UserRole.ADMIN } });
    if (!admin) throw new BadRequestException('No admin user found.');

    const org = await this.orgRepo.findOne({ where: { id: admin.organizationId } });
    if (!org) throw new BadRequestException('No organisation found.');

    // Check if seed already ran (projects exist)
    const existingProjects = await this.projectRepo.count();
    if (existingProjects > 0) {
      throw new BadRequestException('Demo data already loaded.');
    }

    // Create additional demo users (same roles as original seed)
    const demoPw = async (p: string) => bcrypt.hash(p, BCRYPT_ROUNDS);
    const [qaLead, tester] = await this.userRepo.save([
      this.userRepo.create({
        firstName: 'Bob', lastName: 'Lead', email: 'qalead@demo.local',
        passwordHash: await demoPw('QaLead@1234'), role: UserRole.QA_LEAD,
        organizationId: org.id, isActive: true, isEmailVerified: true,
      }),
      this.userRepo.create({
        firstName: 'Carol', lastName: 'Tester', email: 'tester@demo.local',
        passwordHash: await demoPw('Tester@1234'), role: UserRole.TESTER,
        organizationId: org.id, isActive: true, isEmailVerified: true,
      }),
    ]);

    // Projects
    const [ecomProject] = await this.projectRepo.save([
      this.projectRepo.create({ name: 'E-Commerce Platform', description: 'Main e-commerce application', key: 'ECOM', organizationId: org.id, createdBy: admin.id }),
      this.projectRepo.create({ name: 'Mobile App', description: 'iOS and Android app testing', key: 'MOB', organizationId: org.id, createdBy: admin.id }),
      this.projectRepo.create({ name: 'API Gateway', description: 'REST API integration tests', key: 'API', organizationId: org.id, createdBy: qaLead.id }),
    ]);

    // Test Suites
    const [authSuite, cartSuite, checkoutSuite, profileSuite, searchSuite] = await this.suiteRepo.save([
      this.suiteRepo.create({ name: 'Authentication', description: 'Login, logout, session tests', projectId: ecomProject.id, createdBy: qaLead.id }),
      this.suiteRepo.create({ name: 'Shopping Cart', description: 'Cart add/remove/update tests', projectId: ecomProject.id, createdBy: qaLead.id }),
      this.suiteRepo.create({ name: 'Checkout', description: 'Checkout and payment flow tests', projectId: ecomProject.id, createdBy: qaLead.id }),
      this.suiteRepo.create({ name: 'User Profile', description: 'Profile management tests', projectId: ecomProject.id, createdBy: tester.id }),
      this.suiteRepo.create({ name: 'Search & Filters', description: 'Product search and filter tests', projectId: ecomProject.id, createdBy: tester.id }),
    ]);

    // Test Cases
    const tcDefs: any[] = [
      { title: 'User can login with valid credentials', expectedResult: 'User is logged in and sees dashboard', priority: Priority.CRITICAL, type: TestType.MANUAL, status: TestStatus.PASSED, suiteId: authSuite.id, tags: ['login', 'smoke'], steps: [{id:'1',order:1,action:'Navigate to login page',expectedResult:'Login page displayed'},{id:'2',order:2,action:'Enter credentials',expectedResult:'Fields accept input'},{id:'3',order:3,action:'Click Login',expectedResult:'Redirected to dashboard'}], createdBy: qaLead.id, assignedTo: tester.id },
      { title: 'User cannot login with invalid password', expectedResult: 'Error message shown with invalid credentials', priority: Priority.CRITICAL, type: TestType.MANUAL, status: TestStatus.PASSED, suiteId: authSuite.id, tags: ['login', 'negative'], steps: [{id:'1',order:1,action:'Enter wrong password',expectedResult:'Error shown'}], createdBy: qaLead.id, assignedTo: tester.id },
      { title: 'Add product to cart', expectedResult: 'Product appears in cart with correct quantity', priority: Priority.HIGH, type: TestType.AUTOMATED, status: TestStatus.PASSED, suiteId: cartSuite.id, tags: ['cart', 'smoke'], steps: [{id:'1',order:1,action:'Click Add to Cart',expectedResult:'Cart count updates'}], createdBy: qaLead.id, assignedTo: tester.id },
      { title: 'Remove product from cart', expectedResult: 'Product removed and cart total recalculated', priority: Priority.HIGH, type: TestType.AUTOMATED, status: TestStatus.FAILED, suiteId: cartSuite.id, tags: ['cart'], steps: [{id:'1',order:1,action:'Click Remove',expectedResult:'Item removed'}], createdBy: qaLead.id, assignedTo: tester.id },
      { title: 'Complete checkout with credit card', expectedResult: 'Order confirmation page with order number', priority: Priority.CRITICAL, type: TestType.MANUAL, status: TestStatus.BLOCKED, suiteId: checkoutSuite.id, tags: ['checkout', 'payment'], steps: [{id:'1',order:1,action:'Fill checkout form',expectedResult:'Order confirmed'}], createdBy: admin.id, assignedTo: tester.id },
      { title: 'Search products by keyword', expectedResult: 'Relevant products displayed in results', priority: Priority.MEDIUM, type: TestType.AUTOMATED, status: TestStatus.NOT_RUN, suiteId: searchSuite.id, tags: ['search'], steps: [{id:'1',order:1,action:'Enter search term',expectedResult:'Results shown'}], createdBy: tester.id },
      { title: 'Filter products by price range', expectedResult: 'Only products within price range shown', priority: Priority.MEDIUM, type: TestType.AUTOMATED, status: TestStatus.PASSED, suiteId: searchSuite.id, tags: ['filter'], steps: [{id:'1',order:1,action:'Set price filter',expectedResult:'Filtered results'}], createdBy: tester.id, assignedTo: tester.id },
      { title: 'Update user profile information', expectedResult: 'Profile updated successfully', priority: Priority.LOW, type: TestType.MANUAL, status: TestStatus.IN_PROGRESS, suiteId: profileSuite.id, tags: ['profile'], steps: [{id:'1',order:1,action:'Update name',expectedResult:'Changes saved'}], createdBy: admin.id, assignedTo: tester.id },
    ];

    const testCases: TestCase[] = [];
    for (let i = 0; i < tcDefs.length; i++) {
      const tc = (await this.tcRepo.save(this.tcRepo.create({
        ...tcDefs[i],
        tcId: `TC-${String(i + 1).padStart(3, '0')}`,
        projectId: ecomProject.id,
        preconditions: null, description: null,
        jiraTicketId: null, jiraSyncStatus: null,
        assignedTo: tcDefs[i].assignedTo ?? null,
        lastRunAt: tcDefs[i].status !== TestStatus.NOT_RUN ? new Date('2024-06-20') : null,
      })) as unknown) as TestCase;
      testCases.push(tc);
    }

    // Releases
    const [release25, sprint24] = await this.releaseRepo.save([
      this.releaseRepo.create({ name: 'Release 2.5', version: '2.5.0', projectId: ecomProject.id, createdBy: admin.id, status: ReleaseStatus.RELEASED, plannedDate: new Date('2024-06-15'), releasedDate: new Date('2024-06-18') }),
      this.releaseRepo.create({ name: 'Sprint 24', version: '2.6.0-beta', projectId: ecomProject.id, createdBy: qaLead.id, status: ReleaseStatus.IN_PROGRESS, plannedDate: new Date('2024-06-30') }),
    ]);

    // Test Runs
    const run1 = await this.runRepo.save(this.runRepo.create({ name: 'Sprint 24 Regression', projectId: ecomProject.id, releaseId: sprint24.id, createdBy: qaLead.id, assignedTo: tester.id, status: TestRunStatus.ACTIVE, environment: 'Staging', startedAt: new Date('2024-06-20T08:00:00Z'), passRate: 62.5 }));
    const run2 = await this.runRepo.save(this.runRepo.create({ name: 'Release 2.5 Smoke Test', projectId: ecomProject.id, releaseId: release25.id, createdBy: qaLead.id, assignedTo: tester.id, status: TestRunStatus.COMPLETED, environment: 'Production', startedAt: new Date('2024-06-18T09:00:00Z'), completedAt: new Date('2024-06-18T17:00:00Z'), passRate: 100 }));

    await this.runCaseRepo.save([
      { testRunId: run1.id, testCaseId: testCases[0].id, status: TestStatus.PASSED, executedBy: tester.id, executedAt: new Date('2024-06-20T09:30:00Z'), duration: 120, comment: 'All steps passed', defects: [], actualResult: null },
      { testRunId: run1.id, testCaseId: testCases[1].id, status: TestStatus.PASSED, executedBy: tester.id, executedAt: new Date('2024-06-20T09:45:00Z'), duration: 90, comment: null, defects: [], actualResult: null },
      { testRunId: run1.id, testCaseId: testCases[2].id, status: TestStatus.PASSED, executedBy: tester.id, executedAt: new Date('2024-06-20T10:00:00Z'), duration: 45, comment: null, defects: [], actualResult: null },
      { testRunId: run1.id, testCaseId: testCases[3].id, status: TestStatus.FAILED, executedBy: tester.id, executedAt: new Date('2024-06-20T10:15:00Z'), duration: 60, comment: 'Cart total wrong', defects: ['BUG-123'], actualResult: 'Incorrect total' },
      { testRunId: run1.id, testCaseId: testCases[4].id, status: TestStatus.BLOCKED, executedBy: tester.id, executedAt: new Date('2024-06-20T10:30:00Z'), duration: 30, comment: 'Gateway down', defects: ['BUG-124'], actualResult: null },
      { testRunId: run2.id, testCaseId: testCases[0].id, status: TestStatus.PASSED, executedBy: tester.id, executedAt: new Date('2024-06-18T09:30:00Z'), duration: 115, comment: null, defects: [], actualResult: null },
      { testRunId: run2.id, testCaseId: testCases[2].id, status: TestStatus.PASSED, executedBy: tester.id, executedAt: new Date('2024-06-18T10:00:00Z'), duration: 42, comment: null, defects: [], actualResult: null },
    ].map(c => this.runCaseRepo.create(c)));

    return {
      message: 'Demo data loaded successfully.',
      summary: '3 projects · 5 suites · 8 test cases · 2 releases · 2 test runs',
      demoUsers: [
        { email: 'qalead@demo.local', password: 'QaLead@1234', role: 'qa_lead' },
        { email: 'tester@demo.local', password: 'Tester@1234', role: 'tester' },
      ],
    };
  }
}
