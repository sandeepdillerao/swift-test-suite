import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('TestFlow TCM (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should return 201 and send verification email message', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: `test_${Date.now()}@example.com`,
          password: 'SecurePass1!',
          firstName: 'Test',
          lastName: 'User',
          organizationName: `Test Org ${Date.now()}`,
        })
        .expect(201);

      expect(response.body.data.message).toBeDefined();
    });

    it('should return 409 for duplicate email', async () => {
      const email = `dup_${Date.now()}@example.com`;
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email,
          password: 'SecurePass1!',
          firstName: 'Test',
          lastName: 'User',
          organizationName: `Org ${Date.now()}`,
        });

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email,
          password: 'SecurePass1!',
          firstName: 'Test',
          lastName: 'User',
          organizationName: `Another Org ${Date.now()}`,
        })
        .expect(409);
    });
  });

  describe('GET /api/v1/users', () => {
    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users')
        .expect(401);
    });
  });
});
