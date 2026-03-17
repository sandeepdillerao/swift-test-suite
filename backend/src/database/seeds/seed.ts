import * as bcrypt from 'bcryptjs';
import { AppDataSource } from '../data-source';
import { Organization } from '../../modules/organizations/entities/organization.entity';
import { User, UserRole } from '../../modules/users/entities/user.entity';
import { Project } from '../../modules/projects/entities/project.entity';
import { TestSuite } from '../../modules/test-suites/entities/test-suite.entity';
import { TestCase } from '../../modules/test-cases/entities/test-case.entity';
import { Priority, TestStatus, TestType } from '../../modules/test-cases/entities/test-case.enums';
import { Release } from '../../modules/releases/entities/release.entity';
import { ReleaseStatus } from '../../modules/releases/entities/release.enums';
import { TestRun } from '../../modules/test-runs/entities/test-run.entity';
import { TestRunCase } from '../../modules/test-runs/entities/test-run-case.entity';
import { TestRunStatus } from '../../modules/test-runs/entities/test-run.enums';
import { RefreshToken } from '../../modules/auth/entities/refresh-token.entity';

const BCRYPT_ROUNDS = 10;

async function seed() {
  await AppDataSource.initialize();
  console.log('🌱 Starting seed...');

  const orgRepo = AppDataSource.getRepository(Organization);
  const userRepo = AppDataSource.getRepository(User);
  const projectRepo = AppDataSource.getRepository(Project);
  const suiteRepo = AppDataSource.getRepository(TestSuite);
  const tcRepo = AppDataSource.getRepository(TestCase);
  const releaseRepo = AppDataSource.getRepository(Release);
  const runRepo = AppDataSource.getRepository(TestRun);
  const runCaseRepo = AppDataSource.getRepository(TestRunCase);
  const refreshTokenRepo = AppDataSource.getRepository(RefreshToken);

  // ── Clean Phase 2 seed data (order matters for FK constraints) ────────────
  await runCaseRepo.createQueryBuilder().delete().execute();
  await AppDataSource.createQueryBuilder().delete().from('test_run_history').execute();
  await runRepo.createQueryBuilder().delete().execute();
  await tcRepo.createQueryBuilder().delete().execute();
  // Reset the TC ID sequence so seeded IDs start from TC-001
  await AppDataSource.query(`ALTER SEQUENCE IF EXISTS tc_id_seq RESTART WITH 1`);
  await suiteRepo.createQueryBuilder().delete().execute();
  await releaseRepo.createQueryBuilder().delete().execute();
  await projectRepo.createQueryBuilder().delete().execute();
  await refreshTokenRepo.createQueryBuilder().delete().execute();
  await userRepo.delete({ email: 'admin@testflow.dev' });
  await userRepo.delete({ email: 'qalead@testflow.dev' });
  await userRepo.delete({ email: 'tester@testflow.dev' });
  await userRepo.delete({ email: 'viewer@testflow.dev' });
  await orgRepo.delete({ slug: 'testflow-demo' });

  // ── Organization ──────────────────────────────────────────────────────────
  const org = await orgRepo.save(orgRepo.create({
    name: 'TestFlow Demo',
    slug: 'testflow-demo',
    description: 'Demo organization for testing',
    isActive: true,
  }));
  console.log(`✅ Org: ${org.name}`);

  // ── Users ─────────────────────────────────────────────────────────────────
  const userDefs = [
    { email: 'admin@testflow.dev', firstName: 'Alice', lastName: 'Admin', role: UserRole.ADMIN, password: 'Admin@1234' },
    { email: 'qalead@testflow.dev', firstName: 'Bob', lastName: 'Lead', role: UserRole.QA_LEAD, password: 'QaLead@1234' },
    { email: 'tester@testflow.dev', firstName: 'Carol', lastName: 'Tester', role: UserRole.TESTER, password: 'Tester@1234' },
    { email: 'viewer@testflow.dev', firstName: 'Dave', lastName: 'Viewer', role: UserRole.VIEWER, password: 'Viewer@1234' },
  ];

  const users: User[] = [];
  for (const u of userDefs) {
    const user = await userRepo.save(userRepo.create({
      ...u,
      passwordHash: await bcrypt.hash(u.password, BCRYPT_ROUNDS),
      organizationId: org.id,
      isActive: true,
      isEmailVerified: true,
    }));
    users.push(user);
    console.log(`✅ User: ${u.email} (${u.role})`);
  }
  const [admin, qaLead, tester] = users;

  // ── Projects ──────────────────────────────────────────────────────────────
  const projects = await projectRepo.save([
    projectRepo.create({ name: 'E-Commerce Platform', description: 'Main e-commerce application', key: 'ECOM', organizationId: org.id, createdBy: admin.id }),
    projectRepo.create({ name: 'Mobile App', description: 'iOS and Android app testing', key: 'MOB', organizationId: org.id, createdBy: admin.id }),
    projectRepo.create({ name: 'API Gateway', description: 'REST API integration tests', key: 'API', organizationId: org.id, createdBy: qaLead.id }),
  ]);
  console.log(`✅ Projects: ${projects.map(p => p.key).join(', ')}`);
  const [ecomProject] = projects;

  // ── Test Suites ───────────────────────────────────────────────────────────
  const suites = await suiteRepo.save([
    suiteRepo.create({ name: 'Authentication', description: 'Login, logout, session tests', projectId: ecomProject.id, createdBy: qaLead.id }),
    suiteRepo.create({ name: 'Shopping Cart', description: 'Cart add/remove/update tests', projectId: ecomProject.id, createdBy: qaLead.id }),
    suiteRepo.create({ name: 'Checkout', description: 'Checkout and payment flow tests', projectId: ecomProject.id, createdBy: qaLead.id }),
    suiteRepo.create({ name: 'User Profile', description: 'Profile management tests', projectId: ecomProject.id, createdBy: tester.id }),
    suiteRepo.create({ name: 'Search & Filters', description: 'Product search and filter tests', projectId: ecomProject.id, createdBy: tester.id }),
  ]);
  console.log(`✅ Suites: ${suites.map(s => s.name).join(', ')}`);
  const [authSuite, cartSuite, checkoutSuite, profileSuite, searchSuite] = suites;

  // ── Test Cases ────────────────────────────────────────────────────────────
  const tcDefs = [
    {
      title: 'User can login with valid credentials',
      description: 'Verify successful login with valid email and password',
      preconditions: 'User must have a registered account',
      steps: [
        { id: '1', order: 1, action: 'Navigate to login page', expectedResult: 'Login page is displayed' },
        { id: '2', order: 2, action: 'Enter valid email', expectedResult: 'Email is accepted' },
        { id: '3', order: 3, action: 'Enter valid password', expectedResult: 'Password is masked' },
        { id: '4', order: 4, action: 'Click Login button', expectedResult: 'User is redirected to dashboard' },
      ],
      expectedResult: 'User is logged in and sees dashboard',
      priority: Priority.CRITICAL, type: TestType.MANUAL, status: TestStatus.PASSED,
      suiteId: authSuite.id, projectId: ecomProject.id, tags: ['login', 'authentication', 'smoke'],
      createdBy: qaLead.id, assignedTo: tester.id,
      jiraTicketId: 'ECOM-101', jiraSyncStatus: null,
    },
    {
      title: 'User cannot login with invalid password',
      description: 'Verify login fails with incorrect password',
      preconditions: 'User must have a registered account',
      steps: [
        { id: '1', order: 1, action: 'Navigate to login page', expectedResult: 'Login page is displayed' },
        { id: '2', order: 2, action: 'Enter valid email and wrong password', expectedResult: 'Password masked' },
        { id: '3', order: 3, action: 'Click Login button', expectedResult: 'Error message displayed' },
      ],
      expectedResult: 'Error message shows invalid credentials',
      priority: Priority.CRITICAL, type: TestType.MANUAL, status: TestStatus.PASSED,
      suiteId: authSuite.id, projectId: ecomProject.id, tags: ['login', 'authentication', 'negative'],
      createdBy: qaLead.id, assignedTo: tester.id, jiraTicketId: null, jiraSyncStatus: null,
    },
    {
      title: 'Add product to cart',
      description: 'Verify user can add a product to shopping cart',
      preconditions: 'User is logged in',
      steps: [
        { id: '1', order: 1, action: 'Navigate to product page', expectedResult: 'Product details displayed' },
        { id: '2', order: 2, action: 'Click Add to Cart', expectedResult: 'Product added, cart count updates' },
      ],
      expectedResult: 'Product appears in cart with correct quantity',
      priority: Priority.HIGH, type: TestType.AUTOMATED, status: TestStatus.PASSED,
      suiteId: cartSuite.id, projectId: ecomProject.id, tags: ['cart', 'product', 'smoke'],
      createdBy: qaLead.id, assignedTo: tester.id, jiraTicketId: null, jiraSyncStatus: null,
    },
    {
      title: 'Remove product from cart',
      description: 'Verify user can remove a product from cart',
      preconditions: 'User is logged in and has items in cart',
      steps: [
        { id: '1', order: 1, action: 'Navigate to cart page', expectedResult: 'Cart contents displayed' },
        { id: '2', order: 2, action: 'Click Remove on a product', expectedResult: 'Product removed, total updates' },
      ],
      expectedResult: 'Product removed and cart total recalculated',
      priority: Priority.HIGH, type: TestType.AUTOMATED, status: TestStatus.FAILED,
      suiteId: cartSuite.id, projectId: ecomProject.id, tags: ['cart', 'remove'],
      createdBy: qaLead.id, assignedTo: tester.id, jiraTicketId: null, jiraSyncStatus: null,
    },
    {
      title: 'Complete checkout with credit card',
      description: 'Verify user can complete purchase using credit card',
      preconditions: 'User is logged in with items in cart',
      steps: [
        { id: '1', order: 1, action: 'Navigate to checkout', expectedResult: 'Checkout page loads' },
        { id: '2', order: 2, action: 'Enter shipping address', expectedResult: 'Address validated' },
        { id: '3', order: 3, action: 'Enter credit card details', expectedResult: 'Card validated' },
        { id: '4', order: 4, action: 'Click Place Order', expectedResult: 'Order confirmed' },
      ],
      expectedResult: 'Order confirmation page with order number',
      priority: Priority.CRITICAL, type: TestType.MANUAL, status: TestStatus.BLOCKED,
      suiteId: checkoutSuite.id, projectId: ecomProject.id, tags: ['checkout', 'payment', 'critical-path'],
      createdBy: admin.id, assignedTo: tester.id, jiraTicketId: null, jiraSyncStatus: null,
    },
    {
      title: 'Search products by keyword',
      description: 'Verify product search returns relevant results',
      steps: [
        { id: '1', order: 1, action: 'Enter search term', expectedResult: 'Suggestions appear' },
        { id: '2', order: 2, action: 'Press Enter', expectedResult: 'Results page loads' },
      ],
      expectedResult: 'Relevant products displayed',
      priority: Priority.MEDIUM, type: TestType.AUTOMATED, status: TestStatus.NOT_RUN,
      suiteId: searchSuite.id, projectId: ecomProject.id, tags: ['search', 'product'],
      createdBy: tester.id, assignedTo: null, jiraTicketId: null, jiraSyncStatus: null,
    },
    {
      title: 'Filter products by price range',
      description: 'Verify price filter works correctly',
      steps: [
        { id: '1', order: 1, action: 'Set min and max price filter', expectedResult: 'Filter applied' },
        { id: '2', order: 2, action: 'View results', expectedResult: 'Only products in range shown' },
      ],
      expectedResult: 'Only products within price range shown',
      priority: Priority.MEDIUM, type: TestType.AUTOMATED, status: TestStatus.PASSED,
      suiteId: searchSuite.id, projectId: ecomProject.id, tags: ['filter', 'price'],
      createdBy: tester.id, assignedTo: tester.id, jiraTicketId: null, jiraSyncStatus: null,
    },
    {
      title: 'Update user profile information',
      description: 'Verify user can update their profile details',
      preconditions: 'User is logged in',
      steps: [
        { id: '1', order: 1, action: 'Navigate to profile settings', expectedResult: 'Profile page loads' },
        { id: '2', order: 2, action: 'Update name field and click Save', expectedResult: 'Success message appears' },
      ],
      expectedResult: 'Profile updated successfully',
      priority: Priority.LOW, type: TestType.MANUAL, status: TestStatus.IN_PROGRESS,
      suiteId: profileSuite.id, projectId: ecomProject.id, tags: ['profile', 'user'],
      createdBy: admin.id, assignedTo: tester.id, jiraTicketId: null, jiraSyncStatus: null,
    },
  ];

  const testCases: TestCase[] = [];
  for (let i = 0; i < tcDefs.length; i++) {
    const tc = tcDefs[i];
    const tcId = `TC-${String(i + 1).padStart(3, '0')}`;
    const saved = await tcRepo.save(tcRepo.create({
      ...tc,
      tcId,
      preconditions: tc.preconditions ?? null,
      description: tc.description ?? null,
      jiraTicketId: tc.jiraTicketId ?? null,
      jiraSyncStatus: tc.jiraSyncStatus ?? null,
      assignedTo: tc.assignedTo ?? null,
      lastRunAt: tc.status !== TestStatus.NOT_RUN ? new Date('2024-06-20') : null,
    }));
    testCases.push(saved);
  }
  // Advance sequence past the seeded IDs so next real create starts at TC-009
  await AppDataSource.query(`SELECT setval('tc_id_seq', ${tcDefs.length})`);

  console.log(`✅ Test cases: ${testCases.length} created`);

  // ── Releases ──────────────────────────────────────────────────────────────
  const releases = await releaseRepo.save([
    releaseRepo.create({
      name: 'Release 2.5', version: '2.5.0',
      description: 'Major feature release with checkout improvements',
      projectId: ecomProject.id, createdBy: admin.id,
      status: ReleaseStatus.RELEASED,
      plannedDate: new Date('2024-06-15'), releasedDate: new Date('2024-06-18'),
    }),
    releaseRepo.create({
      name: 'Sprint 24', version: '2.6.0-beta',
      description: 'Sprint 24 development cycle',
      projectId: ecomProject.id, createdBy: qaLead.id,
      status: ReleaseStatus.IN_PROGRESS,
      plannedDate: new Date('2024-06-30'),
    }),
    releaseRepo.create({
      name: 'Release 3.0', version: '3.0.0',
      description: 'Major platform overhaul',
      projectId: ecomProject.id, createdBy: admin.id,
      status: ReleaseStatus.PLANNING,
      plannedDate: new Date('2024-08-01'),
    }),
  ]);
  console.log(`✅ Releases: ${releases.map(r => r.name).join(', ')}`);
  const [release25, sprint24] = releases;

  // ── Test Runs ─────────────────────────────────────────────────────────────
  const run1 = await runRepo.save(runRepo.create({
    name: 'Sprint 24 Regression',
    description: 'Full regression for Sprint 24 features',
    projectId: ecomProject.id, releaseId: sprint24.id,
    createdBy: qaLead.id, assignedTo: tester.id,
    status: TestRunStatus.ACTIVE,
    environment: 'Staging', buildNumber: 'build-2024.06.20.1',
    startedAt: new Date('2024-06-20T08:00:00Z'),
    passRate: 62.5,
  }));

  const run2 = await runRepo.save(runRepo.create({
    name: 'Release 2.5 Smoke Test',
    description: 'Smoke test for Release 2.5 deployment',
    projectId: ecomProject.id, releaseId: release25.id,
    createdBy: qaLead.id, assignedTo: tester.id,
    status: TestRunStatus.COMPLETED,
    environment: 'Production', buildNumber: 'build-2024.06.18.1',
    startedAt: new Date('2024-06-18T09:00:00Z'),
    completedAt: new Date('2024-06-18T17:00:00Z'),
    passRate: 100,
  }));
  console.log(`✅ Test runs: Sprint 24 Regression, Release 2.5 Smoke Test`);

  // ── Test Run Cases ────────────────────────────────────────────────────────
  const run1Cases = [
    { testRunId: run1.id, testCaseId: testCases[0].id, status: TestStatus.PASSED, executedBy: tester.id, executedAt: new Date('2024-06-20T09:30:00Z'), duration: 120, comment: 'All steps passed', defects: [] },
    { testRunId: run1.id, testCaseId: testCases[1].id, status: TestStatus.PASSED, executedBy: tester.id, executedAt: new Date('2024-06-20T09:45:00Z'), duration: 90, comment: 'Error message verified', defects: [] },
    { testRunId: run1.id, testCaseId: testCases[2].id, status: TestStatus.PASSED, executedBy: tester.id, executedAt: new Date('2024-06-20T10:00:00Z'), duration: 45, comment: 'Automated pass', defects: [] },
    { testRunId: run1.id, testCaseId: testCases[3].id, status: TestStatus.FAILED, executedBy: tester.id, executedAt: new Date('2024-06-20T10:15:00Z'), duration: 60, comment: 'Cart total wrong after removal', defects: ['BUG-123'], actualResult: 'Incorrect total shown' },
    { testRunId: run1.id, testCaseId: testCases[4].id, status: TestStatus.BLOCKED, executedBy: tester.id, executedAt: new Date('2024-06-20T10:30:00Z'), duration: 30, comment: 'Payment gateway unavailable', defects: ['BUG-124'] },
    { testRunId: run1.id, testCaseId: testCases[5].id, status: TestStatus.NOT_RUN, defects: [] },
    { testRunId: run1.id, testCaseId: testCases[6].id, status: TestStatus.PASSED, executedBy: tester.id, executedAt: new Date('2024-06-20T11:00:00Z'), duration: 35, defects: [] },
    { testRunId: run1.id, testCaseId: testCases[7].id, status: TestStatus.IN_PROGRESS, executedBy: tester.id, defects: [] },
  ];

  const run2Cases = [
    { testRunId: run2.id, testCaseId: testCases[0].id, status: TestStatus.PASSED, executedBy: tester.id, executedAt: new Date('2024-06-18T09:30:00Z'), duration: 115, defects: [] },
    { testRunId: run2.id, testCaseId: testCases[1].id, status: TestStatus.PASSED, executedBy: tester.id, executedAt: new Date('2024-06-18T09:45:00Z'), duration: 88, defects: [] },
    { testRunId: run2.id, testCaseId: testCases[2].id, status: TestStatus.PASSED, executedBy: tester.id, executedAt: new Date('2024-06-18T10:00:00Z'), duration: 42, defects: [] },
    { testRunId: run2.id, testCaseId: testCases[4].id, status: TestStatus.PASSED, executedBy: tester.id, executedAt: new Date('2024-06-18T10:30:00Z'), duration: 180, defects: [] },
  ];

  await runCaseRepo.save([...run1Cases, ...run2Cases].map(c => runCaseRepo.create({
    ...c,
    comment: (c as any).comment ?? null,
    actualResult: (c as any).actualResult ?? null,
    executedBy: (c as any).executedBy ?? null,
    executedAt: (c as any).executedAt ?? null,
    duration: (c as any).duration ?? null,
  })));
  console.log(`✅ Test run cases: ${run1Cases.length + run2Cases.length} created`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n📋 Seed credentials:');
  console.log('─'.repeat(60));
  console.log('Role       Email                    Password');
  console.log('─'.repeat(60));
  for (const u of userDefs) {
    console.log(`${u.role.padEnd(10)} ${u.email.padEnd(25)} ${u.password}`);
  }
  console.log('─'.repeat(60));
  console.log('\n📦 Seeded: 1 org · 4 users · 3 projects · 5 suites · 8 test cases · 3 releases · 2 test runs');

  await AppDataSource.destroy();
  console.log('✅ Seed complete.');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
