const mongoose = require('mongoose');
const expect = require('expect');
const sinon = require('sinon');

const EventSecurityService = require('../src/services/eventSecurityService');
const FraudDetectionService = require('../src/services/fraudDetectionService');
const SystemMonitoringService = require('../src/services/systemMonitoringService');
const User = require('../src/models/User');
const Event = require('../src/models/Event');

describe('Security Services Test Suite', function() {
  let testUser, testEvent;

  beforeAll(async function() {
    // Connect to test database
    await mongoose.connect(process.env.MONGO_TEST_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    // Create test user and event
    testUser = new User({
      username: 'securityTestUser',
      email: 'security@test.com',
      role: 'user'
    });
    await testUser.save();

    testEvent = new Event({
      title: 'Security Test Event',
      description: 'Event for security testing',
      date: new Date(),
      capacity: 100,
      organizer: testUser._id
    });
    await testEvent.save();
  });

  afterAll(async function() {
    // Cleanup test data
    await User.deleteMany({});
    await Event.deleteMany({});
    await mongoose.connection.close();
  });

  describe('Event Security Service', function() {
    it('should generate secure event access token', function() {
      const token = EventSecurityService.generateEventAccessToken(
        testEvent._id, 
        testUser._id
      );
      
      expect(token).toHaveProperty('accessToken');
      expect(token).toHaveProperty('expiresAt');
    });

    it('should validate event access token', function() {
      const { accessToken } = EventSecurityService.generateEventAccessToken(
        testEvent._id, 
        testUser._id
      );
      
      const isValid = EventSecurityService.validateEventAccessToken(
        accessToken, 
        testEvent._id, 
        testUser._id
      );
      
      expect(isValid).toBe(true);
    });

    it('should assess registration risk', async function() {
      const riskAssessment = await EventSecurityService.assessRegistrationRisk(
        testUser._id, 
        testEvent._id
      );
      
      expect(riskAssessment).toHaveProperty('riskLevel');
      expect(riskAssessment).toHaveProperty('riskScore');
      expect(riskAssessment).toHaveProperty('requiresAdditionalVerification');
    });
  });

  describe('Fraud Detection Service', function() {
    it('should detect suspicious user activity', async function() {
      const suspiciousActivity = await FraudDetectionService.detectSuspiciousUserActivity(
        testUser._id
      );
      
      expect(suspiciousActivity).toHaveProperty('userId');
      expect(suspiciousActivity).toHaveProperty('riskScore');
      expect(suspiciousActivity).toHaveProperty('riskLevel');
    });

    it('should run comprehensive fraud check', async function() {
      const fraudCheck = await FraudDetectionService.runComprehensiveFraudCheck(
        testUser._id
      );
      
      expect(fraudCheck).toHaveProperty('userId');
      expect(fraudCheck).toHaveProperty('userActivityRisk');
      expect(fraudCheck).toHaveProperty('ipFraudRisk');
      expect(fraudCheck).toHaveProperty('anomalyRisk');
    });
  });

  describe('System Monitoring Service', function() {
    it('should collect system health metrics', async function() {
      const systemHealth = await SystemMonitoringService.getSystemHealth();
      
      expect(systemHealth).toHaveProperty('cpu');
      expect(systemHealth).toHaveProperty('memory');
      expect(systemHealth).toHaveProperty('heap');
      expect(systemHealth).toHaveProperty('database');
      expect(systemHealth).toHaveProperty('disk');
    });

    it('should generate system report', async function() {
      const systemReport = await SystemMonitoringService.generateSystemReport();
      
      expect(systemReport).toHaveProperty('systemHealth');
      expect(systemReport).toHaveProperty('securityReport');
      expect(systemReport).toHaveProperty('performanceLogs');
      expect(systemReport).toHaveProperty('generatedAt');
    });
  });
});
