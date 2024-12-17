const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const EventService = require('../src/services/eventService');
const Event = require('../src/models/Event');
const User = require('../src/models/User');

describe('Event Service', () => {
  let mongoServer;
  let testUser;

  beforeAll(async () => {
    // Setup MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  beforeEach(async () => {
    // Create a test user
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Event.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('createEvent', () => {
    it('should create a new event successfully', async () => {
      const eventData = {
        title: 'Test Event',
        description: 'Test Description',
        date: new Date(),
        location: 'Test Location',
        organizer: testUser._id
      };

      const event = await EventService.createEvent(eventData);
      expect(event).toBeDefined();
      expect(event.title).toBe(eventData.title);
      expect(event.organizer.toString()).toBe(testUser._id.toString());
    });

    it('should throw validation error for invalid event data', async () => {
      const invalidEventData = {
        // Missing required fields
        description: 'Test Description'
      };

      await expect(EventService.createEvent(invalidEventData)).rejects.toThrow();
    });
  });

  describe('findEvents', () => {
    beforeEach(async () => {
      await Event.create([
        {
          title: 'Event 1',
          description: 'Description 1',
          date: new Date(),
          location: 'Location 1',
          organizer: testUser._id
        },
        {
          title: 'Event 2',
          description: 'Description 2',
          date: new Date(),
          location: 'Location 2',
          organizer: testUser._id
        }
      ]);
    });

    it('should find events with pagination', async () => {
      const events = await EventService.findEvents({}, { page: 1, limit: 10 });
      expect(events.items).toHaveLength(2);
      expect(events.total).toBe(2);
    });

    it('should filter events by title', async () => {
      const events = await EventService.findEvents({ title: 'Event 1' });
      expect(events.items).toHaveLength(1);
      expect(events.items[0].title).toBe('Event 1');
    });
  });

  describe('updateEvent', () => {
    let event;

    beforeEach(async () => {
      event = await Event.create({
        title: 'Original Event',
        description: 'Original Description',
        date: new Date(),
        location: 'Original Location',
        organizer: testUser._id
      });
    });

    it('should update an existing event', async () => {
      const updateData = {
        title: 'Updated Event',
        description: 'Updated Description'
      };

      const updatedEvent = await EventService.updateEvent(event._id, updateData, testUser._id);
      expect(updatedEvent.title).toBe(updateData.title);
      expect(updatedEvent.description).toBe(updateData.description);
    });

    it('should throw error when updating event by unauthorized user', async () => {
      const unauthorizedUser = await User.create({
        username: 'unauthorized',
        email: 'unauthorized@example.com',
        password: 'password123'
      });

      await expect(
        EventService.updateEvent(event._id, { title: 'Unauthorized Update' }, unauthorizedUser._id)
      ).rejects.toThrow();
    });
  });

  describe('registerForEvent', () => {
    let event;
    let attendee;

    beforeEach(async () => {
      event = await Event.create({
        title: 'Test Event',
        description: 'Test Description',
        date: new Date(),
        location: 'Test Location',
        organizer: testUser._id,
        maxParticipants: 10
      });

      attendee = await User.create({
        username: 'attendee',
        email: 'attendee@example.com',
        password: 'password123'
      });
    });

    it('should register user for an event', async () => {
      const updatedEvent = await EventService.registerForEvent(event._id, attendee._id);
      expect(updatedEvent.participants).toContainEqual(attendee._id);
    });

    it('should prevent duplicate registration', async () => {
      await EventService.registerForEvent(event._id, attendee._id);
      await expect(
        EventService.registerForEvent(event._id, attendee._id)
      ).rejects.toThrow();
    });
  });

  describe('cancelEvent', () => {
    let event;

    beforeEach(async () => {
      event = await Event.create({
        title: 'Test Event',
        description: 'Test Description',
        date: new Date(),
        location: 'Test Location',
        organizer: testUser._id
      });
    });

    it('should cancel an event by organizer', async () => {
      const cancelledEvent = await EventService.cancelEvent(event._id, testUser._id);
      expect(cancelledEvent.status).toBe('cancelled');
    });

    it('should prevent cancellation by non-organizer', async () => {
      const nonOrganizer = await User.create({
        username: 'nonorganizer',
        email: 'nonorganizer@example.com',
        password: 'password123'
      });

      await expect(
        EventService.cancelEvent(event._id, nonOrganizer._id)
      ).rejects.toThrow();
    });
  });
});
