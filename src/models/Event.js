const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const validator = require('validator');

/**
 * @swagger
 * components:
 *   schemas:
 *     Location:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *           enum: ['Point']
 *         coordinates:
 *           type: array
 *           items:
 *             type: number
 *         address:
 *           type: object
 *           properties:
 *             street:
 *               type: string
 *             city:
 *               type: string
 *             state:
 *               type: string
 *             country:
 *               type: string
 *             zipCode:
 *               type: string
 * 
 *     Event:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - date
 *         - location
 *         - organizer
 *       properties:
 *         title:
 *           type: string
 *           minLength: 3
 *           maxLength: 100
 *         description:
 *           type: string
 *           minLength: 10
 *           maxLength: 1000
 *         date:
 *           type: string
 *           format: date-time
 *         location:
 *           $ref: '#/components/schemas/Location'
 *         status:
 *           type: string
 *           enum: ['draft', 'published', 'cancelled', 'completed']
 *         capacity:
 *           type: number
 *         tags:
 *           type: array
 *           items:
 *             type: string
 */

const EventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters long'],
    maxlength: [100, 'Title cannot exceed 100 characters'],
    validate: {
      validator: function(v) {
        return /^[a-zA-Z0-9\s\-_.,()]+$/.test(v);
      },
      message: 'Title contains invalid characters'
    }
  },
  description: {
    type: String,
    required: [true, 'Event description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters long'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  date: {
    type: Date,
    required: [true, 'Event date is required'],
    validate: {
      validator: function(v) {
        return v > new Date(); // Future dates only
      },
      message: 'Event date must be in the future'
    }
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], 
      required: [true, 'Coordinates are required'],
      validate: {
        validator: function(v) {
          return v.length === 2 && 
                 v[0] >= -180 && v[0] <= 180 && 
                 v[1] >= -90 && v[1] <= 90;
        },
        message: 'Invalid coordinates'
      },
      index: '2dsphere'
    },
    address: {
      street: {
        type: String,
        trim: true,
        maxlength: [200, 'Street address too long']
      },
      city: {
        type: String,
        trim: true,
        maxlength: [100, 'City name too long']
      },
      state: {
        type: String,
        trim: true,
        maxlength: [50, 'State name too long']
      },
      country: {
        type: String,
        trim: true,
        maxlength: [50, 'Country name too long']
      },
      zipCode: {
        type: String,
        trim: true,
        validate: {
          validator: function(v) {
            return /^[0-9]{5}(-[0-9]{4})?$/.test(v);
          },
          message: 'Invalid ZIP code format'
        }
      }
    }
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Event organizer is required']
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  capacity: {
    type: Number,
    min: [1, 'Capacity must be at least 1'],
    max: [10000, 'Capacity cannot exceed 10,000']
  },
  status: {
    type: String,
    enum: {
      values: ['draft', 'published', 'cancelled', 'completed'],
      message: '{VALUE} is not a valid status'
    },
    default: 'draft'
  },
  tags: {
    type: [String],
    validate: {
      validator: function(v) {
        return v.length <= 10; // Max 10 tags
      },
      message: 'Cannot have more than 10 tags'
    }
  },
  pricing: {
    basePrice: {
      type: Number,
      min: [0, 'Price cannot be negative']
    },
    earlyBirdDiscount: {
      type: Number,
      min: [0, 'Discount cannot be negative'],
      max: [100, 'Discount cannot exceed 100%']
    },
    discountDeadline: Date
  },
  registrationDeadline: {
    type: Date,
    validate: {
      validator: function(v) {
        return !this.date || v < this.date;
      },
      message: 'Registration deadline must be before event date'
    }
  },
  requiredDocuments: [String],
  accessibilityOptions: {
    wheelchairAccessible: Boolean,
    signLanguageInterpreter: Boolean,
    brailleProgram: Boolean
  },
  socialMediaLinks: {
    facebook: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || validator.isURL(v, { host_whitelist: ['www.facebook.com', 'facebook.com'] });
        },
        message: 'Invalid Facebook URL'
      }
    },
    twitter: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || validator.isURL(v, { host_whitelist: ['www.twitter.com', 'twitter.com'] });
        },
        message: 'Invalid Twitter URL'
      }
    },
    instagram: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || validator.isURL(v, { host_whitelist: ['www.instagram.com', 'instagram.com'] });
        },
        message: 'Invalid Instagram URL'
      }
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for remaining capacity
EventSchema.virtual('remainingCapacity').get(function() {
  return this.capacity - this.participants.length;
});

// Advanced geospatial method to find nearby events with more options
EventSchema.statics.findNearby = function(longitude, latitude, options = {}) {
  const {
    maxDistance = 10000, // Default 10km
    minDistance = 0,
    limit = 10,
    tags = [],
    dateRange = {}
  } = options;

  const query = {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance,
        $minDistance: minDistance
      }
    }
  };

  // Optional tag filtering
  if (tags.length > 0) {
    query.tags = { $in: tags };
  }

  // Optional date range filtering
  if (dateRange.start || dateRange.end) {
    query.date = {};
    if (dateRange.start) query.date.$gte = dateRange.start;
    if (dateRange.end) query.date.$lte = dateRange.end;
  }

  return this.find(query).limit(limit);
};

// Indexing for performance
EventSchema.index({ 'location.coordinates': '2dsphere' });
EventSchema.index({ date: 1, status: 1 });
EventSchema.index({ tags: 1 });

// Add mongoose-paginate plugin
EventSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Event', EventSchema);
