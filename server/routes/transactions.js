const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readDB, writeDB } = require('../utils/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get all transactions for a user
router.get('/', authMiddleware, (req, res) => {
  try {
    const db = readDB();
    const userTransactions = db.transactions.filter(
      t => t.paidBy === req.userId || t.participants.some(p => p.userId === req.userId)
    );

    res.json(userTransactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Create transaction
router.post('/', authMiddleware, (req, res) => {
  try {
    const { description, amount, category, paidBy, participants, groupId, type, date } = req.body;

    if (!description || !amount || !participants || participants.length === 0) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }

    const db = readDB();

    const transaction = {
      id: uuidv4(),
      description,
      amount: parseFloat(amount),
      category: category || 'general',
      paidBy: paidBy || req.userId,
      participants: participants.map(p => ({
        userId: p.userId,
        share: parseFloat(p.share),
        settled: p.settled || false
      })),
      groupId: groupId || null,
      type: type || 'expense',
      date: date || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      createdBy: req.userId
    };

    db.transactions.push(transaction);
    writeDB(db);

    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// Get transaction by ID
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const db = readDB();
    const transaction = db.transactions.find(t => t.id === req.params.id);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const hasAccess = transaction.paidBy === req.userId || 
                      transaction.participants.some(p => p.userId === req.userId);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// Update transaction
router.put('/:id', authMiddleware, (req, res) => {
  try {
    const db = readDB();
    const transactionIndex = db.transactions.findIndex(t => t.id === req.params.id);

    if (transactionIndex === -1) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = db.transactions[transactionIndex];

    if (transaction.createdBy !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updatedTransaction = {
      ...transaction,
      ...req.body,
      id: transaction.id,
      createdBy: transaction.createdBy,
      createdAt: transaction.createdAt,
      updatedAt: new Date().toISOString()
    };

    db.transactions[transactionIndex] = updatedTransaction;
    writeDB(db);

    res.json(updatedTransaction);
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// Delete transaction
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const db = readDB();
    const transactionIndex = db.transactions.findIndex(t => t.id === req.params.id);

    if (transactionIndex === -1) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = db.transactions[transactionIndex];

    if (transaction.createdBy !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    db.transactions.splice(transactionIndex, 1);
    writeDB(db);

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

module.exports = router;
