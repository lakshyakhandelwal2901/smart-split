const express = require('express');
const { readDB, writeDB } = require('../utils/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get current user
router.get('/me', authMiddleware, (req, res) => {
  try {
    const db = readDB();
    const user = db.users.find(u => u.id === req.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password, ...userWithoutPassword } = user;

    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Search users
router.get('/search', authMiddleware, (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Please provide search query' });
    }

    const db = readDB();
    const searchResults = db.users
      .filter(u => 
        u.name.toLowerCase().includes(query.toLowerCase()) ||
        u.email.toLowerCase().includes(query.toLowerCase()) ||
        (u.phone && u.phone.includes(query))
      )
      .map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone
      }))
      .slice(0, 10);

    res.json(searchResults);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Get user by ID
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const db = readDB();
    const user = db.users.find(u => u.id === req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user profile
router.put('/me', authMiddleware, (req, res) => {
  try {
    const { name, phone } = req.body;

    const db = readDB();
    const userIndex = db.users.findIndex(u => u.id === req.userId);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = db.users[userIndex];

    const updatedUser = {
      ...user,
      name: name || user.name,
      phone: phone !== undefined ? phone : user.phone,
      updatedAt: new Date().toISOString()
    };

    db.users[userIndex] = updatedUser;
    writeDB(db);

    const { password, ...userWithoutPassword } = updatedUser;

    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

module.exports = router;
