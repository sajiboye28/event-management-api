const Event = require('../models/Event');
const User = require('../models/User');
const mongoose = require('mongoose');

class EventRecommendationService {
  // Advanced recommendation algorithm
  static async getPersonalizedRecommendations(userId, options = {}) {
    try {
      const user = await User.findById(userId);
      
      // Default options
      const {
        limit = 10,
        maxDistance = 50, // kilometers
        userLocation = null
      } = options;

      // Aggregate recommendation pipeline
      const recommendations = await Event.aggregate([
        // Stage 1: User's past event analysis
        {
          $match: {
            participants: mongoose.Types.ObjectId(userId),
            date: { $lt: new Date() } // Past events
          }
        },
        {
          $group: {
            _id: null,
            tags: { $addToSet: '$tags' },
            pastEventLocations: { $addToSet: '$location.coordinates' }
          }
        },
        
        // Stage 2: Recommendation matching
        {
          $lookup: {
            from: 'events',
            let: { 
              userTags: '$tags',
              pastLocations: '$pastEventLocations'
            },
            pipeline: [
              // Future events
              { $match: { 
                date: { $gt: new Date() },
                $nor: [{ participants: mongoose.Types.ObjectId(userId) }]
              }},
              
              // Tag-based matching
              {
                $addFields: {
                  tagMatchScore: {
                    $size: {
                      $setIntersection: ['$tags', '$$userTags']
                    }
                  }
                }
              },
              
              // Location-based scoring
              {
                $addFields: {
                  locationMatchScore: {
                    $reduce: {
                      input: '$$pastLocations',
                      initialValue: 0,
                      in: {
                        $add: [
                          '$$value',
                          {
                            $cond: [
                              { $lt: [
                                { $distance: ['$location.coordinates', '$$this'] },
                                maxDistance * 1000 // Convert to meters
                              ]},
                              1,
                              0
                            ]
                          }
                        ]
                      }
                    }
                  }
                }
              },
              
              // Combine scores
              {
                $addFields: {
                  recommendationScore: {
                    $add: [
                      { $multiply: ['$tagMatchScore', 2] }, // Weight tags higher
                      '$locationMatchScore'
                    ]
                  }
                }
              },
              
              // Sort and limit
              { $sort: { recommendationScore: -1 } },
              { $limit: limit }
            ],
            as: 'recommendedEvents'
          }
        }
      ]);

      // Flatten and return recommendations
      return recommendations[0]?.recommendedEvents || [];
    } catch (error) {
      console.error('Personalized recommendation error:', error);
      throw error;
    }
  }

  // Machine learning-inspired recommendation refinement
  static async refineRecommendations(userId, recommendedEvents) {
    try {
      // Collect user feedback and interaction data
      const userInteractions = await Event.aggregate([
        { $match: { 
          participants: mongoose.Types.ObjectId(userId),
          status: 'completed' 
        }},
        {
          $group: {
            _id: '$tags',
            attendanceCount: { $sum: 1 },
            averageRating: { $avg: '$rating' }
          }
        }
      ]);

      // Apply feedback-based filtering
      return recommendedEvents.map(event => {
        const tagMatchScore = event.tags.reduce((score, tag) => {
          const interaction = userInteractions.find(
            interaction => interaction._id.includes(tag)
          );
          
          return interaction 
            ? score + (interaction.attendanceCount * interaction.averageRating)
            : score;
        }, 0);

        return {
          ...event,
          refinedRecommendationScore: tagMatchScore
        };
      }).sort((a, b) => 
        b.refinedRecommendationScore - a.refinedRecommendationScore
      );
    } catch (error) {
      console.error('Recommendation refinement error:', error);
      throw error;
    }
  }

  // Collaborative filtering approach
  static async getCollaborativeRecommendations(userId) {
    try {
      // Get user's attended events first
      const user = await User.findById(userId).populate('attendedEvents');
      if (!user) {
        throw new Error('User not found');
      }

      // Find similar users based on event history
      const similarUsers = await User.aggregate([
        { $match: { _id: { $ne: mongoose.Types.ObjectId(userId) } } },
        {
          $project: {
            userId: '$_id',
            commonEventCount: {
              $size: {
                $setIntersection: ['$attendedEvents', user.attendedEvents]
              }
            }
          }
        },
        { $sort: { commonEventCount: -1 } },
        { $limit: 5 } // Top 5 similar users
      ]);

      // Get events these similar users attended but current user hasn't
      const collaborativeRecommendations = await Event.aggregate([
        {
          $match: {
            participants: { 
              $in: similarUsers.map(u => u.userId) 
            },
            date: { $gt: new Date() },
            $nor: [{ participants: mongoose.Types.ObjectId(userId) }]
          }
        },
        {
          $addFields: {
            similarityScore: {
              $reduce: {
                input: similarUsers,
                initialValue: 0,
                in: {
                  $add: [
                    '$$value',
                    { $cond: [
                      { $in: ['$$this.userId', '$participants'] },
                      '$$this.commonEventCount',
                      0
                    ]}
                  ]
                }
              }
            }
          }
        },
        { $sort: { similarityScore: -1 } },
        { $limit: 10 }
      ]);

      return collaborativeRecommendations;
    } catch (error) {
      console.error('Collaborative recommendation error:', error);
      throw error;
    }
  }
}

module.exports = EventRecommendationService;
