const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readDB, writeDB } = require('../utils/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Initialize bank accounts collection if it doesn't exist
function ensureBankAccountsCollection() {
  const db = readDB();
  if (!db.bankAccounts) {
    db.bankAccounts = [];
    writeDB(db);
  }
  if (!db.bankTransactions) {
    db.bankTransactions = [];
    writeDB(db);
  }
}

// Get all connected bank accounts
router.get('/', authMiddleware, (req, res) => {
  try {
    ensureBankAccountsCollection();
    const db = readDB();
    const userAccounts = db.bankAccounts.filter(acc => acc.userId === req.userId);
    res.json(userAccounts);
  } catch (error) {
    console.error('Error fetching bank accounts:', error);
    res.status(500).json({ error: 'Failed to fetch bank accounts' });
  }
});

// Connect a bank account (simulated)
router.post('/connect', authMiddleware, (req, res) => {
  try {
    ensureBankAccountsCollection();
    const { bankName, accountNumber, accountType, ifsc } = req.body;

    if (!bankName || !accountNumber) {
      return res.status(400).json({ error: 'Please provide bank name and account number' });
    }

    const db = readDB();

    const bankAccount = {
      id: uuidv4(),
      userId: req.userId,
      bankName,
      accountNumber: accountNumber.slice(-4), // Store only last 4 digits
      accountType: accountType || 'savings',
      ifsc: ifsc || '',
      balance: Math.floor(Math.random() * 100000) + 10000, // Simulated balance
      isActive: true,
      connectedAt: new Date().toISOString(),
      lastSyncedAt: new Date().toISOString()
    };

    db.bankAccounts.push(bankAccount);
    writeDB(db);

    res.status(201).json(bankAccount);
  } catch (error) {
    console.error('Error connecting bank account:', error);
    res.status(500).json({ error: 'Failed to connect bank account' });
  }
});

// Disconnect bank account
router.delete('/:accountId', authMiddleware, (req, res) => {
  try {
    ensureBankAccountsCollection();
    const db = readDB();
    const accountIndex = db.bankAccounts.findIndex(
      acc => acc.id === req.params.accountId && acc.userId === req.userId
    );

    if (accountIndex === -1) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    db.bankAccounts.splice(accountIndex, 1);
    writeDB(db);

    res.json({ message: 'Bank account disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting bank account:', error);
    res.status(500).json({ error: 'Failed to disconnect bank account' });
  }
});

// Sync transactions from bank (simulated)
router.post('/:accountId/sync', authMiddleware, (req, res) => {
  try {
    ensureBankAccountsCollection();
    const db = readDB();
    const account = db.bankAccounts.find(
      acc => acc.id === req.params.accountId && acc.userId === req.userId
    );

    if (!account) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    // Generate mock transactions
    const categories = ['food', 'transport', 'shopping', 'entertainment', 'utilities', 'groceries', 'other'];
    const merchants = ['Swiggy', 'Zomato', 'Amazon', 'Flipkart', 'Big Bazaar', 'DMart', 'Uber', 'Ola', 'Netflix', 'Spotify'];
    const mockTransactions = [];

    for (let i = 0; i < 10; i++) {
      const isDebit = Math.random() > 0.3; // 70% debits, 30% credits
      const amount = Math.floor(Math.random() * 5000) + 50;
      const daysAgo = Math.floor(Math.random() * 30);
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);

      const transaction = {
        id: uuidv4(),
        accountId: account.id,
        userId: req.userId,
        type: isDebit ? 'debit' : 'credit',
        amount,
        balance: account.balance + (isDebit ? -amount : amount),
        description: isDebit ? merchants[Math.floor(Math.random() * merchants.length)] : 'Transfer',
        category: isDebit ? categories[Math.floor(Math.random() * categories.length)] : 'income',
        date: date.toISOString().split('T')[0],
        timestamp: date.toISOString(),
        reference: `TXN${Date.now()}${i}`,
        status: 'completed',
        isImported: false
      };

      mockTransactions.push(transaction);
    }

    // Add transactions to database
    db.bankTransactions.push(...mockTransactions);
    
    // Update last synced time
    account.lastSyncedAt = new Date().toISOString();
    writeDB(db);

    res.json({ 
      message: 'Transactions synced successfully',
      count: mockTransactions.length,
      transactions: mockTransactions
    });
  } catch (error) {
    console.error('Error syncing transactions:', error);
    res.status(500).json({ error: 'Failed to sync transactions' });
  }
});

// Get bank transactions
router.get('/:accountId/transactions', authMiddleware, (req, res) => {
  try {
    ensureBankAccountsCollection();
    const db = readDB();
    const transactions = db.bankTransactions.filter(
      txn => txn.accountId === req.params.accountId && txn.userId === req.userId
    );

    // Sort by date descending
    transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(transactions);
  } catch (error) {
    console.error('Error fetching bank transactions:', error);
    res.status(500).json({ error: 'Failed to fetch bank transactions' });
  }
});

// Import bank transaction as expense
router.post('/transactions/:transactionId/import', authMiddleware, (req, res) => {
  try {
    ensureBankAccountsCollection();
    const db = readDB();
    const bankTxn = db.bankTransactions.find(
      txn => txn.id === req.params.transactionId && txn.userId === req.userId
    );

    if (!bankTxn) {
      return res.status(404).json({ error: 'Bank transaction not found' });
    }

    if (bankTxn.isImported) {
      return res.status(400).json({ error: 'Transaction already imported' });
    }

    // Get participants from request body, or default to current user only
    const { participants } = req.body;
    let expenseParticipants;

    if (participants && participants.length > 0) {
      // Validate that shares add up to total amount
      const totalShares = participants.reduce((sum, p) => sum + (p.share || 0), 0);
      if (Math.abs(totalShares - bankTxn.amount) > 0.01) {
        return res.status(400).json({ 
          error: `Total shares (${totalShares}) must equal transaction amount (${bankTxn.amount})` 
        });
      }

      expenseParticipants = participants.map(p => ({
        userId: p.userId,
        share: p.share,
        settled: p.userId === req.userId // User who paid is automatically settled
      }));
    } else {
      // Default: only current user
      expenseParticipants = [{
        userId: req.userId,
        share: bankTxn.amount,
        settled: true
      }];
    }

    // Create expense transaction
    const expense = {
      id: uuidv4(),
      description: bankTxn.description,
      amount: bankTxn.amount,
      category: bankTxn.category,
      paidBy: req.userId,
      participants: expenseParticipants,
      groupId: null,
      type: 'expense',
      date: bankTxn.date,
      createdAt: new Date().toISOString(),
      createdBy: req.userId,
      bankTransactionId: bankTxn.id
    };

    db.transactions.push(expense);
    
    // Mark as imported
    bankTxn.isImported = true;
    bankTxn.expenseId = expense.id;
    
    writeDB(db);

    res.status(201).json({ expense, bankTransaction: bankTxn });
  } catch (error) {
    console.error('Error importing transaction:', error);
    res.status(500).json({ error: 'Failed to import transaction' });
  }
});

module.exports = router;
