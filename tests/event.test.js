const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Event = require('../src/models/Event');

describe('Events API', () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear collections
    await User.deleteMany({});
    await Event.deleteMany({});

    // Register a user and get token
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'eventuser',
        email: 'event@example.com',
        password: 'password123'
      });

    authToken = registerRes.body.token;
    
    // Get user ID from login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'event@example.com',
        password: 'password123'
      });

    userId = loginRes.body.user.id;
  });

  describe('POST /api/events', () => {
    it('should create a new event', async () => {
      const res = await request(app)
        .post('/api/events')
        .set('x-auth-token', authToken)
        .send({
          title: 'Tech Conference 2023',
          description: 'Annual technology conference',
          date: new Date('2023-09-15'),
          location: {
            address: '123 Tech Street',
            city: 'San Francisco',
            country: 'USA'
          }
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body.title).toEqual('Tech Conference 2023');
    });

    it('should not create an event without authentication', async () => {
      const res = await request(app)
        .post('/api/events')
        .send({
          title: 'Unauthorized Event'
        });

      expect(res.statusCode).toEqual(401);
    });
  });

  describe('GET /api/events', () => {
    beforeEach(async () => {
      // Create some test events
      await request(app)
        .post('/api/events')
        .set('x-auth-token', authToken)
        .send({
          title: 'Event 1',
          description: 'First test event',
          date: new Date('2023-08-15'),
          location: {
            address: '456 Main St',
            city: 'New York',
            country: 'USA'
          }
        });

      await request(app)
        .post('/api/events')
        .set('x-auth-token', authToken)
        .send({
          title: 'Event 2',
          description: 'Second test event',
          date: new Date('2023-09-20'),
          location: {
            address: '789 Oak Rd',
            city: 'Chicago',
            country: 'USA'
          }
        });
    });

    it('should retrieve all events', async () => {
      const res = await request(app).get('/api/events');

      expect(res.statusCode).toEqual(200);
      expect(res.body.length).toEqual(2);
    });
  });

  describe('PUT /api/events/:id', () => {
    let eventId;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/api/events')
        .set('x-auth-token', authToken)
        .send({
          title: 'Update Test Event',
          description: 'Event to be updated',
          date: new Date('2023-10-15'),
          location: {
            address: '321 Update St',
            city: 'Seattle',
            country: 'USA'
          }
        });

      eventId = createRes.body._id;
    });

    it('should update an existing event', async () => {
      const res = await request(app)
        .put(`/api/events/${eventId}`)
        .set('x-auth-token', authToken)
        .send({
          title: 'Updated Event Title',
          description: 'Updated description'
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.title).toEqual('Updated Event Title');
    });

    it('should not update an event without authentication', async () => {
      const res = await request(app)
        .put(`/api/events/${eventId}`)
        .send({
          title: 'Unauthorized Update'
        });

      expect(res.statusCode).toEqual(401);
    });
  });
});
