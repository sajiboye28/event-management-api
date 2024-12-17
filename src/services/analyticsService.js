const Event = require('../models/Event');
const User = require('../models/User');
const mongoose = require('mongoose');

class AnalyticsService {
  /**
   * Generate comprehensive event analytics
   * @returns {Promise<Object>} Detailed event analytics
   */
  static async generateEventAnalytics() {
    try {
      const currentDate = new Date();
      
      // Aggregate analytics across multiple dimensions
      const analytics = await Event.aggregate([
        // Match published and future events
        { $match: { 
          status: 'published', 
          date: { $gte: currentDate } 
        }},
        
        // Multi-dimensional grouping and analysis
        {
          $facet: {
            // Event Category Distribution
            categoryDistribution: [
              { $unwind: '$tags' },
              { 
                $group: { 
                  _id: '$tags', 
                  count: { $sum: 1 },
                  totalCapacity: { $sum: '$capacity' },
                  averageParticipants: { $avg: { $size: '$participants' } }
                }
              },
              { $sort: { count: -1 } }
            ],
            
            // Geographic Distribution
            geographicDistribution: [
              { 
                $group: { 
                  _id: '$location.city', 
                  eventCount: { $sum: 1 },
                  totalEvents: { $sum: 1 },
                  averageCapacity: { $avg: '$capacity' }
                }
              },
              { $sort: { eventCount: -1 } }
            ],
            
            // Temporal Analytics
            temporalAnalytics: [
              {
                $group: {
                  _id: { 
                    month: { $month: '$date' },
                    year: { $year: '$date' }
                  },
                  eventCount: { $sum: 1 },
                  totalCapacity: { $sum: '$capacity' }
                }
              },
              { $sort: { '_id.year': 1, '_id.month': 1 } }
            ],
            
            // Engagement Metrics
            engagementMetrics: [
              {
                $addFields: {
                  participationRate: { 
                    $divide: [{ $size: '$participants' }, '$capacity'] 
                  }
                }
              },
              {
                $group: {
                  _id: null,
                  averageParticipationRate: { $avg: '$participationRate' },
                  totalEvents: { $sum: 1 },
                  totalCapacity: { $sum: '$capacity' }
                }
              }
            ]
          }
        }
      ]);

      return analytics[0];
    } catch (error) {
      console.error('Analytics generation error:', error);
      throw new Error('Failed to generate event analytics');
    }
  }

  /**
   * Generate user engagement insights
   * @param {String} userId - Optional user ID for personalized insights
   * @returns {Promise<Object>} User engagement analytics
   */
  static async getUserEngagementInsights(userId = null) {
    try {
      const matchStage = userId 
        ? { $match: { _id: mongoose.Types.ObjectId(userId) } }
        : { $match: {} };

      const insights = await User.aggregate([
        matchStage,
        {
          $facet: {
            // User Event Participation
            eventParticipation: [
              {
                $addFields: {
                  eventsAttended: { $size: '$attendedEvents' },
                  eventsOrganized: { $size: '$organizedEvents' }
                }
              },
              {
                $group: {
                  _id: userId ? '$_id' : null,
                  averageEventsAttended: { $avg: '$eventsAttended' },
                  averageEventsOrganized: { $avg: '$eventsOrganized' },
                  totalUsers: { $sum: 1 }
                }
              }
            ],
            
            // Interest Distribution
            interestDistribution: [
              { $unwind: '$interests' },
              {
                $group: {
                  _id: '$interests',
                  userCount: { $sum: 1 }
                }
              },
              { $sort: { userCount: -1 } }
            ]
          }
        }
      ]);

      return insights[0];
    } catch (error) {
      console.error('User engagement insights error:', error);
      throw new Error('Failed to generate user engagement insights');
    }
  }

  /**
   * Predict event popularity and potential success
   * @param {Object} eventDetails - Proposed event details
   * @returns {Promise<Object>} Event success prediction
   */
  static async predictEventSuccess(eventDetails) {
    try {
      // Machine learning-inspired prediction model
      const similarEvents = await Event.find({
        tags: { $in: eventDetails.tags },
        'location.city': eventDetails.location.city
      });

      const historicalData = similarEvents.map(event => ({
        capacity: event.capacity,
        participants: event.participants.length,
        tags: event.tags
      }));

      // Simple prediction logic (can be replaced with ML model)
      const averageParticipationRate = historicalData.length
        ? historicalData.reduce((sum, event) => sum + (event.participants / event.capacity), 0) / historicalData.length
        : 0.5;

      const tagMatchScore = eventDetails.tags.length * 0.1;
      
      return {
        predictedParticipationRate: averageParticipationRate + tagMatchScore,
        recommendedCapacity: Math.round(eventDetails.capacity * (1 + tagMatchScore)),
        similarEventsCount: historicalData.length
      };
    } catch (error) {
      console.error('Event success prediction error:', error);
      throw new Error('Failed to predict event success');
    }
  }
}

module.exports = AnalyticsService;
