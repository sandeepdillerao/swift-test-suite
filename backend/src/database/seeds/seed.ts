import { AppDataSource } from '../data-source';
import { Organization } from '../../modules/organizations/entities/organization.entity';
import { User, UserRole } from '../../modules/users/entities/user.entity';
import * as bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 10;

async function seed() {
  await AppDataSource.initialize();
  console.log('🌱 Starting seed...');

  const orgRepo = AppDataSource.getRepository(Organization);
  const userRepo = AppDataSource.getRepository(User);

  // Clean existing seed data
  await userRepo.delete({ email: 'admin@testflow.dev' });
  await userRepo.delete({ email: 'qalead@testflow.dev' });
  await userRepo.delete({ email: 'tester@testflow.dev' });
  await userRepo.delete({ email: 'viewer@testflow.dev' });
  await orgRepo.delete({ slug: 'testflow-demo' });

  // Create demo organization
  const org = orgRepo.create({
    name: 'TestFlow Demo',
    slug: 'testflow-demo',
    description: 'Demo organization for testing',
    isActive: true,
  });
  const savedOrg = await orgRepo.save(org);
  console.log(`✅ Organization created: ${savedOrg.name} (${savedOrg.id})`);

  // Seed users
  const seedUsers: Array<{
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    password: string;
  }> = [
    {
      email: 'admin@testflow.dev',
      firstName: 'Alice',
      lastName: 'Admin',
      role: UserRole.ADMIN,
      password: 'Admin@1234',
    },
    {
      email: 'qalead@testflow.dev',
      firstName: 'Bob',
      lastName: 'Lead',
      role: UserRole.QA_LEAD,
      password: 'QaLead@1234',
    },
    {
      email: 'tester@testflow.dev',
      firstName: 'Carol',
      lastName: 'Tester',
      role: UserRole.TESTER,
      password: 'Tester@1234',
    },
    {
      email: 'viewer@testflow.dev',
      firstName: 'Dave',
      lastName: 'Viewer',
      role: UserRole.VIEWER,
      password: 'Viewer@1234',
    },
  ];

  for (const u of seedUsers) {
    const passwordHash = await bcrypt.hash(u.password, BCRYPT_ROUNDS);
    const user = userRepo.create({
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      passwordHash,
      role: u.role,
      organizationId: savedOrg.id,
      isActive: true,
      isEmailVerified: true,
    });
    await userRepo.save(user);
    console.log(`✅ User created: ${u.email}  password: ${u.password}  role: ${u.role}`);
  }

  console.log('\n📋 Seed credentials summary:');
  console.log('─'.repeat(60));
  console.log('Role       Email                    Password');
  console.log('─'.repeat(60));
  for (const u of seedUsers) {
    console.log(`${u.role.padEnd(10)} ${u.email.padEnd(25)} ${u.password}`);
  }
  console.log('─'.repeat(60));

  await AppDataSource.destroy();
  console.log('\n✅ Seed complete.');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
