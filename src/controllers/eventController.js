const Event = require('../models/Event');
const mongoose = require('mongoose');

// Create a new event
exports.createEvent = async (req, res) => {
  try {
    const { title, description, date, location, organizer } = req.body;
    
    const newEvent = new Event({
      title,
      description,
      date,
      location,
      organizer: req.user.id // From auth middleware
    });

    const event = await newEvent.save();
    res.status(201).json(event);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating event' });
  }
};

// Get all events
exports.getAllEvents = async (req, res) => {
  try {
    const events = await Event.find().populate('organizer', 'username email');
    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching events' });
  }
};

// Get a single event by ID
exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('organizer', 'username email');
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching event' });
  }
};

// Update an event
exports.updateEvent = async (req, res) => {
  try {
    const { title, description, date, location } = req.body;
    
    let event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Ensure only the organizer can update the event
    if (event.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this event' });
    }

    event = await Event.findByIdAndUpdate(
      req.params.id, 
      { title, description, date, location },
      { new: true }
    );

    res.json(event);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating event' });
  }
};

// Delete an event
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Ensure only the organizer can delete the event
    if (event.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this event' });
    }

    await event.remove();
    res.json({ message: 'Event removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting event' });
  }
};

// Advanced event search with multiple filters
exports.searchEvents = async (req, res) => {
  try {
    const { 
      title, 
      tags, 
      minPrice, 
      maxPrice, 
      startDate, 
      endDate, 
      status, 
      longitude, 
      latitude, 
      maxDistance,
      page = 1,
      limit = 10
    } = req.query;

    // Build query object
    const query = {};

    // Text search
    if (title) {
      query.title = { $regex: title, $options: 'i' };
    }

    // Tag filtering
    if (tags) {
      query.tags = { $in: tags.split(',') };
    }

    // Price range
    if (minPrice || maxPrice) {
      query['pricing.basePrice'] = {};
      if (minPrice) query['pricing.basePrice'].$gte = parseFloat(minPrice);
      if (maxPrice) query['pricing.basePrice'].$lte = parseFloat(maxPrice);
    }

    // Date range
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Status filtering
    if (status) {
      query.status = status;
    }

    // Geospatial search
    if (longitude && latitude) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: maxDistance || 10000 // Default 10km
        }
      };
    }

    // Pagination
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      populate: ['organizer', 'participants'],
      sort: { date: 1 }
    };

    const result = await Event.paginate(query, options);

    res.json({
      events: result.docs,
      totalEvents: result.totalDocs,
      totalPages: result.totalPages,
      currentPage: result.page
    });
  } catch (error) {
    console.error('Event search error:', error);
    res.status(500).json({ message: 'Error searching events', error: error.message });
  }
};

// Get events with early bird discount
exports.getEarlyBirdEvents = async (req, res) => {
  try {
    const now = new Date();
    const events = await Event.find({
      'pricing.discountDeadline': { $gte: now },
      'pricing.earlyBirdDiscount': { $gt: 0 }
    }).sort({ 'pricing.discountDeadline': 1 });

    res.json(events);
  } catch (error) {
    console.error('Early bird events error:', error);
    res.status(500).json({ message: 'Error fetching early bird events', error: error.message });
  }
};

// Register for an event
exports.registerForEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check registration deadline
    if (event.registrationDeadline && event.registrationDeadline < new Date()) {
      return res.status(400).json({ message: 'Registration deadline has passed' });
    }

    // Check event capacity
    if (event.capacity && event.participants.length >= event.capacity) {
      return res.status(400).json({ message: 'Event is full' });
    }

    // Check if user already registered
    if (event.participants.includes(userId)) {
      return res.status(400).json({ message: 'Already registered for this event' });
    }

    // Add user to participants
    event.participants.push(userId);
    await event.save();

    res.status(200).json({ 
      message: 'Successfully registered', 
      remainingCapacity: event.remainingCapacity 
    });
  } catch (error) {
    console.error('Event registration error:', error);
    res.status(500).json({ message: 'Error registering for event', error: error.message });
  }
};

// Advanced event recommendation system
exports.getRecommendedEvents = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find user's past events and tags
    const userEvents = await Event.find({ 
      participants: userId 
    }).select('tags');

    // Extract most frequent tags
    const tagFrequency = {};
    userEvents.forEach(event => {
      event.tags.forEach(tag => {
        tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
      });
    });

    // Sort tags by frequency
    const topTags = Object.entries(tagFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]);

    // Find recommended events
    const recommendedEvents = await Event.aggregate([
      {
        $match: {
          tags: { $in: topTags },
          date: { $gt: new Date() }, // Future events
          participants: { $ne: userId } // Not already registered
        }
      },
      {
        $addFields: {
          tagMatchScore: {
            $size: {
              $setIntersection: ['$tags', topTags]
            }
          }
        }
      },
      { $sort: { tagMatchScore: -1, date: 1 } },
      { $limit: 10 }
    ]);

    res.json({
      recommendedEvents,
      matchedTags: topTags
    });
  } catch (error) {
    console.error('Event recommendation error:', error);
    res.status(500).json({ 
      message: 'Error generating event recommendations', 
      error: error.message 
    });
  }
};

// Get recent activity
exports.getRecentActivity = async (req, res) => {
  try {
    console.log('getRecentActivity called');
    
    // Fetch recent events from the database
    const recentEvents = await Event.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title description date location createdAt');
    
    console.log('Recent events fetched:', recentEvents);
    
    if (!recentEvents || recentEvents.length === 0) {
      return res.status(200).json([]);
    }
    
    return res.status(200).json(recentEvents);
  } catch (error) {
    console.error('Error in getRecentActivity:', error);
    return res.status(500).json({ 
      message: 'Error fetching recent activities',
      error: error.message 
    });
  }
};

// Complex event analytics
exports.getEventAnalytics = async (req, res) => {
  try {
    const analytics = await Event.aggregate([
      // Group events by status and calculate metrics
      {
        $group: {
          _id: '$status',
          totalEvents: { $sum: 1 },
          totalParticipants: { $sum: { $size: '$participants' } },
          averageCapacity: { $avg: '$capacity' },
          upcomingEvents: {
            $sum: {
              $cond: [
                { $gt: ['$date', new Date()] },
                1,
                0
              ]
            }
          }
        }
      },
      // Additional aggregations
      {
        $addFields: {
          participationRate: {
            $divide: ['$totalParticipants', '$totalEvents']
          }
        }
      },
      // Geospatial event distribution
      {
        $lookup: {
          from: 'events',
          let: { status: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$status', '$$status'] }
              }
            },
            {
              $group: {
                _id: '$location.address.city',
                eventCount: { $sum: 1 }
              }
            },
            { $sort: { eventCount: -1 } },
            { $limit: 5 }
          ],
          as: 'topCities'
        }
      }
    ]);

    // Pricing insights
    const pricingInsights = await Event.aggregate([
      {
        $group: {
          _id: null,
          averageBasePrice: { $avg: '$pricing.basePrice' },
          totalEarlyBirdEvents: {
            $sum: {
              $cond: [
                { $gt: ['$pricing.earlyBirdDiscount', 0] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    res.json({
      eventStatusAnalytics: analytics,
      pricingInsights: pricingInsights[0]
    });
  } catch (error) {
    console.error('Event analytics error:', error);
    res.status(500).json({ 
      message: 'Error generating event analytics', 
      error: error.message 
    });
  }
};
