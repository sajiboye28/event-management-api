const User = require('../models/User');
const Event = require('../models/Event');

// Get user profile
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching user profile' });
  }
};

// Update user profile
exports.updateUserProfile = async (req, res) => {
  try {
    const { username, email } = req.body;

    const userFields = {};
    if (username) userFields.username = username;
    if (email) userFields.email = email;

    const user = await User.findByIdAndUpdate(
      req.user.id, 
      { $set: userFields }, 
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating user profile' });
  }
};

// Get user's events
exports.getUserEvents = async (req, res) => {
  try {
    const events = await Event.find({ organizer: req.user.id });
    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching user events' });
  }
};
