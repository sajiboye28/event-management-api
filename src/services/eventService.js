const Event = require('../models/Event');
const logger = require('../utils/logger');

class EventService {
  /**
   * Create a new event
   * @param {Object} eventData - Event creation data
   * @param {String} organizerId - ID of the event organizer
   * @returns {Promise<Object>} Created event
   */
  async createEvent(eventData, organizerId) {
    try {
      const event = new Event({
        ...eventData,
        organizer: organizerId,
        status: 'draft'
      });

      await event.validate();
      await event.save();

      logger.info('Event created successfully', { 
        eventId: event._id, 
        organizerId 
      });

      return event;
    } catch (error) {
      logger.error('Event creation failed', { 
        error: error.message, 
        eventData 
      });
      throw error;
    }
  }

  /**
   * Find events with advanced filtering and pagination
   * @param {Object} filters - Search filters
   * @param {Object} options - Pagination and sorting options
   * @returns {Promise<Object>} Paginated events
   */
  async findEvents(filters = {}, options = {}) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'date',
      sortOrder = 'asc'
    } = options;

    try {
      const query = this.buildQuery(filters);
      
      const result = await Event.paginate(query, {
        page,
        limit,
        sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 },
        populate: ['organizer', 'participants']
      });

      logger.info('Events retrieved successfully', { 
        totalEvents: result.totalDocs, 
        page: result.page 
      });

      return result;
    } catch (error) {
      logger.error('Event search failed', { 
        error: error.message, 
        filters 
      });
      throw error;
    }
  }

  /**
   * Build a dynamic query based on filters
   * @param {Object} filters - Search filters
   * @returns {Object} MongoDB query
   */
  buildQuery(filters) {
    const query = {};

    // Title partial match
    if (filters.title) {
      query.title = { $regex: filters.title, $options: 'i' };
    }

    // Date range filtering
    if (filters.startDate || filters.endDate) {
      query.date = {};
      if (filters.startDate) query.date.$gte = new Date(filters.startDate);
      if (filters.endDate) query.date.$lte = new Date(filters.endDate);
    }

    // Status filtering
    if (filters.status) {
      query.status = filters.status;
    }

    // Tags filtering
    if (filters.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }

    // Location-based filtering
    if (filters.longitude && filters.latitude) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [filters.longitude, filters.latitude]
          },
          $maxDistance: filters.maxDistance || 10000
        }
      };
    }

    return query;
  }

  /**
   * Update an existing event
   * @param {String} eventId - ID of the event to update
   * @param {Object} updateData - Data to update
   * @param {String} userId - ID of the user updating the event
   * @returns {Promise<Object>} Updated event
   */
  async updateEvent(eventId, updateData, userId) {
    try {
      const event = await Event.findById(eventId);

      if (!event) {
        throw new Error('Event not found');
      }

      // Check if user is the organizer
      if (event.organizer.toString() !== userId) {
        throw new Error('Unauthorized to update this event');
      }

      // Merge update data
      Object.keys(updateData).forEach(key => {
        event[key] = updateData[key];
      });

      await event.validate();
      await event.save();

      logger.info('Event updated successfully', { 
        eventId, 
        userId 
      });

      return event;
    } catch (error) {
      logger.error('Event update failed', { 
        error: error.message, 
        eventId 
      });
      throw error;
    }
  }

  /**
   * Register a user for an event
   * @param {String} eventId - ID of the event
   * @param {String} userId - ID of the user registering
   * @returns {Promise<Object>} Updated event
   */
  async registerForEvent(eventId, userId) {
    try {
      const event = await Event.findById(eventId);

      if (!event) {
        throw new Error('Event not found');
      }

      // Check event status
      if (event.status !== 'published') {
        throw new Error('Event is not open for registration');
      }

      // Check capacity
      if (event.capacity && event.participants.length >= event.capacity) {
        throw new Error('Event is full');
      }

      // Prevent duplicate registration
      if (event.participants.includes(userId)) {
        throw new Error('Already registered for this event');
      }

      event.participants.push(userId);
      await event.save();

      logger.info('User registered for event', { 
        eventId, 
        userId 
      });

      return event;
    } catch (error) {
      logger.error('Event registration failed', { 
        error: error.message, 
        eventId 
      });
      throw error;
    }
  }

  /**
   * Cancel an event
   * @param {String} eventId - ID of the event to cancel
   * @param {String} userId - ID of the user cancelling the event
   * @returns {Promise<Object>} Cancelled event
   */
  async cancelEvent(eventId, userId) {
    try {
      const event = await Event.findById(eventId);

      if (!event) {
        throw new Error('Event not found');
      }

      // Check if user is the organizer
      if (event.organizer.toString() !== userId) {
        throw new Error('Unauthorized to cancel this event');
      }

      event.status = 'cancelled';
      await event.save();

      logger.info('Event cancelled', { 
        eventId, 
        userId 
      });

      return event;
    } catch (error) {
      logger.error('Event cancellation failed', { 
        error: error.message, 
        eventId 
      });
      throw error;
    }
  }
}

module.exports = new EventService();
