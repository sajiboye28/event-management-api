const mongoose = require('mongoose');
const { expect } = require('chai');
const sinon = require('sinon');

const EventSecurityService = require('../src/services/eventSecurityService');
const FraudDetectionService = require('../src/services/fraudDetectionService');
const SystemMonitoringService = require('../src/services/systemMonitoringService');
const User = require('../src/models/User');
const Event = require('../src/models/Event');

describe('Security Services Test Suite', function() {
  let testUser, testEvent;

  before(async function() {
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

  after(async function() {
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
      
      expect(token).to.have.property('accessToken');
      expect(token).to.have.property('expiresAt');
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
      
      expect(isValid).to.be.true;
    });

    it('should assess registration risk', async function() {
      const riskAssessment = await EventSecurityService.assessRegistrationRisk(
        testUser._id, 
        testEvent._id
      );
      
      expect(riskAssessment).to.have.property('riskLevel');
      expect(riskAssessment).to.have.property('riskScore');
      expect(riskAssessment).to.have.property('requiresAdditionalVerification');
    });
  });

  describe('Fraud Detection Service', function() {
    it('should detect suspicious user activity', async function() {
      const suspiciousActivity = await FraudDetectionService.detectSuspiciousUserActivity(
        testUser._id
      );
      
      expect(suspiciousActivity).to.have.property('userId');
      expect(suspiciousActivity).to.have.property('riskScore');
      expect(suspiciousActivity).to.have.property('riskLevel');
    });

    it('should run comprehensive fraud check', async function() {
      const fraudCheck = await FraudDetectionService.runComprehensiveFraudCheck(
        testUser._id
      );
      
      expect(fraudCheck).to.have.property('userId');
      expect(fraudCheck).to.have.property('userActivityRisk');
      expect(fraudCheck).to.have.property('ipFraudRisk');
      expect(fraudCheck).to.have.property('anomalyRisk');
    });
  });

  describe('System Monitoring Service', function() {
    it('should collect system health metrics', async function() {
      const systemHealth = await SystemMonitoringService.getSystemHealth();
      
      expect(systemHealth).to.have.property('cpu');
      expect(systemHealth).to.have.property('memory');
      expect(systemHealth).to.have.property('heap');
      expect(systemHealth).to.have.property('database');
      expect(systemHealth).to.have.property('disk');
    });

    it('should generate system report', async function() {
      const systemReport = await SystemMonitoringService.generateSystemReport();
      
      expect(systemReport).to.have.property('systemHealth');
      expect(systemReport).to.have.property('securityReport');
      expect(systemReport).to.have.property('performanceLogs');
      expect(systemReport).to.have.property('generatedAt');
    });
  });
});
