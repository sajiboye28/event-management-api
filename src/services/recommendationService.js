const Event = require('../models/Event');
const User = require('../models/User');
const mongoose = require('mongoose');

class RecommendationService {
  /**
   * Generate personalized event recommendations
   * @param {String} userId - ID of the user to generate recommendations for
   * @param {Object} options - Additional filtering options
   * @returns {Promise<Array>} Recommended events
   */
  static async generatePersonalizedRecommendations(userId, options = {}) {
    try {
      // Fetch user's profile and past event interactions
      const user = await User.findById(userId).populate('interests');

      // Base recommendation pipeline
      const recommendationPipeline = [
        // Match events not already attended
        { 
          $match: { 
            participants: { $ne: mongoose.Types.ObjectId(userId) },
            status: 'published',
            date: { $gt: new Date() }
          } 
        },
        // Score events based on multiple factors
        { 
          $addFields: {
            // Machine learning-inspired scoring
            relevanceScore: {
              $add: [
                // Tag matching
                { $size: { $setIntersection: ['$tags', user.interests || []] } },
                
                // Location proximity (simplified)
                { $cond: [
                  { $eq: ['$location.city', user.preferredCity] }, 
                  5, 
                  0 
                ]},
                
                // Popularity boost
                { $divide: ['$participants.length', 100] },
                
                // Recency factor
                { $subtract: [
                  30, 
                  { $divide: [{ $subtract: ['$date', new Date()] }, (1000 * 60 * 60 * 24)] }
                ]}
              ]
            }
          }
        },
        // Sort by relevance score
        { $sort: { relevanceScore: -1 } },
        // Limit recommendations
        { $limit: options.limit || 10 }
      ];

      return await Event.aggregate(recommendationPipeline);
    } catch (error) {
      console.error('Recommendation generation error:', error);
      throw new Error('Failed to generate recommendations');
    }
  }

  /**
   * Find similar events based on multiple criteria
   * @param {String} eventId - Base event to find similar events for
   * @returns {Promise<Array>} Similar events
   */
  static async findSimilarEvents(eventId) {
    try {
      const baseEvent = await Event.findById(eventId);
      
      if (!baseEvent) {
        throw new Error('Event not found');
      }

      return await Event.find({
        _id: { $ne: eventId },
        $or: [
          { tags: { $in: baseEvent.tags } },
          { 
            'location.city': baseEvent.location.city,
            date: { 
              $gte: new Date(baseEvent.date.getTime() - 30 * 24 * 60 * 60 * 1000),
              $lte: new Date(baseEvent.date.getTime() + 30 * 24 * 60 * 60 * 1000)
            }
          }
        ]
      }).limit(5);
    } catch (error) {
      console.error('Similar events search error:', error);
      throw new Error('Failed to find similar events');
    }
  }

  /**
   * Collaborative filtering-inspired recommendation
   * @param {String} userId - User to generate recommendations for
   * @returns {Promise<Array>} Recommended events based on similar users
   */
  static async collaborativeRecommendations(userId) {
    try {
      // Find users with similar event attendance
      const similarUsers = await User.aggregate([
        { $match: { _id: { $ne: mongoose.Types.ObjectId(userId) } } },
        { 
          $addFields: {
            similarityScore: {
              $size: { $setIntersection: ['$attendedEvents', '$attendedEvents'] }
            }
          }
        },
        { $sort: { similarityScore: -1 } },
        { $limit: 5 }
      ]);

      // Aggregate events attended by similar users
      const recommendedEvents = await Event.aggregate([
        { 
          $match: { 
            participants: { 
              $in: similarUsers.map(user => user._id) 
            },
            status: 'published',
            date: { $gt: new Date() }
          } 
        },
        { $sample: { size: 10 } }
      ]);

      return recommendedEvents;
    } catch (error) {
      console.error('Collaborative recommendations error:', error);
      throw new Error('Failed to generate collaborative recommendations');
    }
  }
}

module.exports = RecommendationService;
