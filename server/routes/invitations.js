const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readDB, writeDB } = require('../utils/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Create invitation
router.post('/', authMiddleware, (req, res) => {
  try {
    const { email, phone, name, message } = req.body;

    if (!email && !phone && !name) {
      return res.status(400).json({ error: 'Please provide at least email, phone, or name' });
    }

    const db = readDB();

    // Check if user exists by email
    let invitedUser = null;
    if (email) {
      invitedUser = db.users.find(u => u.email === email);
    }

    // Create invitation
    const invitation = {
      id: uuidv4(),
      invitedBy: req.userId,
      invitedByEmail: db.users.find(u => u.id === req.userId)?.email,
      invitedByName: db.users.find(u => u.id === req.userId)?.name,
      email: email || null,
      phone: phone || null,
      name: name || null,
      userId: invitedUser?.id || null,
      message: message || '',
      status: invitedUser ? 'connected' : 'pending',
      createdAt: new Date().toISOString()
    };

    if (!db.invitations) {
      db.invitations = [];
    }

    db.invitations.push(invitation);
    writeDB(db);

    res.status(201).json(invitation);
  } catch (error) {
    console.error('Error creating invitation:', error);
    res.status(500).json({ error: 'Failed to create invitation' });
  }
});

// Get invitations sent by user
router.get('/sent', authMiddleware, (req, res) => {
  try {
    const db = readDB();
    const invitations = (db.invitations || []).filter(i => i.invitedBy === req.userId);

    res.json(invitations);
  } catch (error) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

// Get invitations received by user
router.get('/received', authMiddleware, (req, res) => {
  try {
    const db = readDB();
    const user = db.users.find(u => u.id === req.userId);
    
    const invitations = (db.invitations || []).filter(i => 
      (i.email && i.email === user.email) || 
      (i.phone && i.phone === user.phone) ||
      i.userId === req.userId
    );

    res.json(invitations);
  } catch (error) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

// Accept invitation
router.post('/:id/accept', authMiddleware, (req, res) => {
  try {
    const db = readDB();
    const invitationIndex = (db.invitations || []).findIndex(i => i.id === req.params.id);

    if (invitationIndex === -1) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    const invitation = db.invitations[invitationIndex];
    invitation.userId = req.userId;
    invitation.status = 'accepted';
    invitation.acceptedAt = new Date().toISOString();

    writeDB(db);

    res.json(invitation);
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

// Get user's contacts/connections
router.get('/contacts', authMiddleware, (req, res) => {
  try {
    const db = readDB();
    const user = db.users.find(u => u.id === req.userId);
    
    // Get all accepted invitations and connections
    const contacts = (db.invitations || []).filter(i => 
      (i.status === 'accepted' || i.status === 'connected') &&
      ((i.invitedBy === req.userId && i.userId) || 
       (i.userId === req.userId && i.invitedBy))
    ).map(i => {
      const contactId = i.invitedBy === req.userId ? i.userId : i.invitedBy;
      const contactUser = db.users.find(u => u.id === contactId);
      return contactUser ? {
        id: contactUser.id,
        name: contactUser.name,
        email: contactUser.email,
        phone: contactUser.phone
      } : null;
    }).filter(Boolean);

    res.json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

module.exports = router;
