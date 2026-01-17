const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readDB, writeDB } = require('../utils/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get all groups for a user
router.get('/', authMiddleware, (req, res) => {
  try {
    const db = readDB();
    const userGroups = db.groups.filter(
      g => g.members.some(m => m.userId === req.userId)
    );

    res.json(userGroups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Create group
router.post('/', authMiddleware, (req, res) => {
  try {
    const { name, description, members } = req.body;

    if (!name || !members || members.length === 0) {
      return res.status(400).json({ error: 'Please provide group name and members' });
    }

    const db = readDB();

    const memberUserIds = members.map(m => m.userId);
    if (!memberUserIds.includes(req.userId)) {
      members.push({ userId: req.userId, role: 'admin' });
    }

    const group = {
      id: uuidv4(),
      name,
      description: description || '',
      members: members.map(m => ({
        userId: m.userId,
        role: m.role || 'member',
        joinedAt: new Date().toISOString()
      })),
      createdBy: req.userId,
      createdAt: new Date().toISOString()
    };

    db.groups.push(group);
    writeDB(db);

    res.status(201).json(group);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// Get group by ID
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const db = readDB();
    const group = db.groups.find(g => g.id === req.params.id);

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const isMember = group.members.some(m => m.userId === req.userId);
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const groupTransactions = db.transactions.filter(t => t.groupId === group.id);

    const balances = calculateGroupBalances(groupTransactions, group.members);

    res.json({ ...group, transactions: groupTransactions, balances });
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ error: 'Failed to fetch group' });
  }
});

// Update group
router.put('/:id', authMiddleware, (req, res) => {
  try {
    const db = readDB();
    const groupIndex = db.groups.findIndex(g => g.id === req.params.id);

    if (groupIndex === -1) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const group = db.groups[groupIndex];

    const userMember = group.members.find(m => m.userId === req.userId);
    if (!userMember || userMember.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update group' });
    }

    const updatedGroup = {
      ...group,
      ...req.body,
      id: group.id,
      createdBy: group.createdBy,
      createdAt: group.createdAt,
      updatedAt: new Date().toISOString()
    };

    db.groups[groupIndex] = updatedGroup;
    writeDB(db);

    res.json(updatedGroup);
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({ error: 'Failed to update group' });
  }
});

// Add member to group
router.post('/:id/members', authMiddleware, (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Please provide userId' });
    }

    const db = readDB();
    const groupIndex = db.groups.findIndex(g => g.id === req.params.id);

    if (groupIndex === -1) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const group = db.groups[groupIndex];

    const userMember = group.members.find(m => m.userId === req.userId);
    if (!userMember || userMember.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can add members' });
    }

    if (group.members.some(m => m.userId === userId)) {
      return res.status(400).json({ error: 'Member already in group' });
    }

    group.members.push({
      userId,
      role: 'member',
      joinedAt: new Date().toISOString()
    });

    db.groups[groupIndex] = group;
    writeDB(db);

    res.json(group);
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

function calculateGroupBalances(transactions, members) {
  const balances = {};

  members.forEach(m => {
    balances[m.userId] = 0;
  });

  transactions.forEach(t => {
    if (balances.hasOwnProperty(t.paidBy)) {
      balances[t.paidBy] += t.amount;
    }

    t.participants.forEach(p => {
      if (balances.hasOwnProperty(p.userId)) {
        balances[p.userId] -= p.share;
      }
    });
  });

  return balances;
}

module.exports = router;
