const request = require('supertest');
const app = require('../../src/app');
const SecurityConfig = require('../../src/config/securityConfig');
const User = require('../../src/models/User');
const connectDB = require('../../src/config/database');

describe('Security Integration Tests', () => {
  let authToken;
  
  beforeAll(async () => {
    await connectDB();
    
    // Create test user
    const testUser = new User({
      username: 'securitytestuser',
      email: 'security@test.com',
      password: await SecurityConfig.hashPassword('SecurePass123!'),
      role: 'admin'
    });
    await testUser.save();
    
    // Generate auth token
    authToken = SecurityConfig.generateToken(testUser);
  });
  
  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });
  
  describe('Authentication Endpoints', () => {
    test('Should prevent unauthorized access', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .expect(401);
      
      expect(response.body.error).toBe('Unauthorized');
    });
    
    test('Should allow authorized access', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('dashboard');
    });
  });
  
  describe('Rate Limiting', () => {
    test('Should limit repeated login attempts', async () => {
      const loginAttempts = Array(15).fill().map(() => 
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'security@test.com',
            password: 'WrongPassword'
          })
      );
      
      const responses = await Promise.all(loginAttempts);
      
      const blockedAttempts = responses.filter(
        response => response.status === 429
      );
      
      expect(blockedAttempts.length).toBeGreaterThan(0);
    });
  });
  
  describe('Input Sanitization', () => {
    test('Should sanitize NoSQL injection attempts', async () => {
      const injectionPayload = {
        username: { $ne: null },
        password: { $gt: '' }
      };
      
      const response = await request(app)
        .post('/api/auth/login')
        .send(injectionPayload)
        .expect(400);
      
      expect(response.body.error).toContain('Invalid input');
    });
  });
});
