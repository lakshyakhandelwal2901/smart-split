const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readDB, writeDB } = require('../utils/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get settlements for user
router.get('/', authMiddleware, (req, res) => {
  try {
    const db = readDB();
    const userSettlements = db.settlements.filter(
      s => s.paidBy === req.userId || s.paidTo === req.userId
    );

    res.json(userSettlements);
  } catch (error) {
    console.error('Error fetching settlements:', error);
    res.status(500).json({ error: 'Failed to fetch settlements' });
  }
});

// Create settlement
router.post('/', authMiddleware, (req, res) => {
  try {
    const { paidTo, amount, note, groupId } = req.body;

    if (!paidTo || !amount) {
      return res.status(400).json({ error: 'Please provide paidTo and amount' });
    }

    const db = readDB();

    const settlement = {
      id: uuidv4(),
      paidBy: req.userId,
      paidTo,
      amount: parseFloat(amount),
      note: note || '',
      groupId: groupId || null,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    db.settlements.push(settlement);
    writeDB(db);

    res.status(201).json(settlement);
  } catch (error) {
    console.error('Error creating settlement:', error);
    res.status(500).json({ error: 'Failed to create settlement' });
  }
});

// Calculate balances between users
router.get('/balances', authMiddleware, (req, res) => {
  try {
    const db = readDB();
    const userId = req.userId;
    const userBalances = {}; // Track {userId: balance} where positive = they owe us, negative = we owe them

    console.log('=== CALCULATING BALANCES ===');
    console.log('Current user ID:', userId);

    // Process transactions
    if (db.transactions && Array.isArray(db.transactions) && db.transactions.length > 0) {
      console.log('Total transactions in DB:', db.transactions.length);
      
      db.transactions.forEach((transaction, idx) => {
        console.log(`\nTransaction ${idx + 1}:`, {
          id: transaction.id,
          description: transaction.description,
          amount: transaction.amount,
          paidBy: transaction.paidBy,
          participantCount: transaction.participants?.length || 0
        });

        // If current user paid
        if (transaction.paidBy === userId) {
          console.log('  -> Current user PAID this transaction');
          if (transaction.participants && Array.isArray(transaction.participants)) {
            transaction.participants.forEach(participant => {
              const otherUserId = participant.userId;
              // They owe us their share (positive balance)
              if (otherUserId !== userId) {
                userBalances[otherUserId] = (userBalances[otherUserId] || 0) + participant.share;
                console.log(`     -> ${otherUserId} owes us ₹${participant.share}`);
              }
            });
          }
        }

        // If current user is a participant (but didn't pay)
        if (transaction.participants && Array.isArray(transaction.participants)) {
          const userParticipant = transaction.participants.find(p => p.userId === userId);
          if (userParticipant && transaction.paidBy !== userId) {
            // We owe the payer this amount (negative balance)
            const payerId = transaction.paidBy;
            userBalances[payerId] = (userBalances[payerId] || 0) - userParticipant.share;
            console.log(`  -> Current user PARTICIPATED (share: ₹${userParticipant.share})`);
            console.log(`     -> We owe ${payerId} ₹${userParticipant.share}`);
          }
        }
      });
    }

    console.log('\nAfter transactions, balances:', userBalances);

    // Process settlements to adjust balances
    if (db.settlements && Array.isArray(db.settlements) && db.settlements.length > 0) {
      console.log('Processing settlements...');
      db.settlements.forEach(settlement => {
        if (settlement.paidBy === userId) {
          // We paid them, so we owe them less (or they owe us more)
          // If we had negative balance (we owed them), it should become less negative (closer to 0)
          // If we had positive balance (they owed us), it should become more positive (they owe us more)
          // But actually, when we pay someone a settlement, it reduces what we owe them
          userBalances[settlement.paidTo] = (userBalances[settlement.paidTo] || 0) + settlement.amount;
          console.log(`We paid ${settlement.paidTo} ₹${settlement.amount}`);
        } else if (settlement.paidTo === userId) {
          // They paid us, so they owe us less (or we owe them more)
          // When someone pays us a settlement, it reduces what they owe us
          userBalances[settlement.paidBy] = (userBalances[settlement.paidBy] || 0) - settlement.amount;
          console.log(`${settlement.paidBy} paid us ₹${settlement.amount}`);
        }
      });
    }

    console.log('\nFinal user balances:', userBalances);

    // Calculate totals
    let totalOwed = 0; // Money others owe us
    let totalOwing = 0; // Money we owe others

    Object.entries(userBalances).forEach(([otherId, balance]) => {
      if (balance > 0.01) {
        totalOwed += balance;
        console.log(`User ${otherId} owes us: ₹${balance}`);
      } else if (balance < -0.01) {
        totalOwing += Math.abs(balance);
        console.log(`We owe user ${otherId}: ₹${Math.abs(balance)}`);
      }
    });

    console.log('\n=== SUMMARY ===');
    console.log('Total owed to us:', totalOwed);
    console.log('Total we owe:', totalOwing);
    console.log('Net balance:', totalOwed - totalOwing);
    console.log('==================\n');

    // Format response for balances page
    const formattedBalances = Object.entries(userBalances)
      .filter(([_, amount]) => Math.abs(amount) > 0.01)
      .map(([otherId, amount]) => {
        return {
          user1: userId,
          user2: otherId,
          amount: Math.abs(amount),
          owedBy: amount < 0 ? userId : otherId,
          owedTo: amount < 0 ? otherId : userId
        };
      });

    // Return with summary totals
    res.json({
      balances: formattedBalances,
      summary: {
        totalOwed,
        totalOwing,
        netBalance: totalOwed - totalOwing
      }
    });
  } catch (error) {
    console.error('Error calculating balances:', error);
    res.status(500).json({ error: 'Failed to calculate balances', details: error.message });
  }
});

module.exports = router;
