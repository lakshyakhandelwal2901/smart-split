import { useState, useEffect } from 'react';
import axios from 'axios';
import { CreditCard, Plus, RefreshCw, Trash2, Download, Check, Building2, Users, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function BankAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [formData, setFormData] = useState({
    bankName: '',
    accountNumber: '',
    accountType: 'savings',
    ifsc: ''
  });
  const [splitData, setSplitData] = useState({
    participants: [],
    splitType: 'equal'
  });
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [connecting, setConnecting] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await axios.get('/api/bank-accounts');
      setAccounts(response.data);
      if (response.data.length > 0 && !selectedAccount) {
        setSelectedAccount(response.data[0]);
        fetchTransactions(response.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (accountId) => {
    try {
      const response = await axios.get(`/api/bank-accounts/${accountId}/transactions`);
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const connectAccount = async (e) => {
    e.preventDefault();
    setConnecting(true);

    try {
      const response = await axios.post('/api/bank-accounts/connect', formData);
      setAccounts([...accounts, response.data]);
      setShowConnectModal(false);
      setFormData({ bankName: '', accountNumber: '', accountType: 'savings', ifsc: '' });
      
      // Automatically sync transactions for new account
      await syncTransactions(response.data.id);
    } catch (error) {
      console.error('Error connecting account:', error);
      alert('Failed to connect bank account');
    } finally {
      setConnecting(false);
    }
  };

  const syncTransactions = async (accountId) => {
    setSyncing(true);
    try {
      const response = await axios.post(`/api/bank-accounts/${accountId}/sync`);
      await fetchTransactions(accountId);
      alert(`Synced ${response.data.count} transactions`);
    } catch (error) {
      console.error('Error syncing transactions:', error);
      alert('Failed to sync transactions');
    } finally {
      setSyncing(false);
    }
  };

  const disconnectAccount = async (accountId) => {
    if (!confirm('Are you sure you want to disconnect this bank account?')) return;

    try {
      await axios.delete(`/api/bank-accounts/${accountId}`);
      setAccounts(accounts.filter(acc => acc.id !== accountId));
      if (selectedAccount?.id === accountId) {
        setSelectedAccount(null);
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error disconnecting account:', error);
      alert('Failed to disconnect account');
    }
  };

  const openSplitModal = (transaction) => {
    setSelectedTransaction(transaction);
    setSplitData({
      participants: [{ userId: user.id, userName: user.name, share: transaction.amount }],
      splitType: 'equal'
    });
    setShowSplitModal(true);
  };

  const searchUsers = async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const response = await axios.get(`/api/users/search?query=${encodeURIComponent(query)}`);
      setSearchResults(response.data.filter(u => u.id !== user.id));
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const addParticipant = (selectedUser) => {
    if (splitData.participants.find(p => p.userId === selectedUser.id)) return;
    
    const newParticipants = [...splitData.participants, {
      userId: selectedUser.id,
      userName: selectedUser.name,
      share: 0
    }];

    if (splitData.splitType === 'equal') {
      const shareAmount = selectedTransaction.amount / newParticipants.length;
      newParticipants.forEach(p => p.share = shareAmount);
    }

    setSplitData({ ...splitData, participants: newParticipants });
    setUserSearch('');
    setSearchResults([]);
  };

  const removeParticipant = (userId) => {
    if (userId === user.id) return; // Can't remove self
    
    const newParticipants = splitData.participants.filter(p => p.userId !== userId);
    
    if (splitData.splitType === 'equal') {
      const shareAmount = selectedTransaction.amount / newParticipants.length;
      newParticipants.forEach(p => p.share = shareAmount);
    }

    setSplitData({ ...splitData, participants: newParticipants });
  };

  const handleSplitTypeChange = (type) => {
    const newParticipants = [...splitData.participants];
    
    if (type === 'equal') {
      const shareAmount = selectedTransaction.amount / newParticipants.length;
      newParticipants.forEach(p => p.share = shareAmount);
    }

    setSplitData({ ...splitData, splitType: type, participants: newParticipants });
  };

  const updateParticipantShare = (userId, share) => {
    const newParticipants = splitData.participants.map(p =>
      p.userId === userId ? { ...p, share: parseFloat(share) || 0 } : p
    );
    setSplitData({ ...splitData, participants: newParticipants });
  };

  const importTransaction = async () => {
    setImporting(true);
    try {
      const totalShares = splitData.participants.reduce((sum, p) => sum + p.share, 0);
      
      if (Math.abs(totalShares - selectedTransaction.amount) > 0.01) {
        alert(`Total shares (₹${totalShares.toFixed(2)}) must equal transaction amount (₹${selectedTransaction.amount.toFixed(2)})`);
        return;
      }

      await axios.post(`/api/bank-accounts/transactions/${selectedTransaction.id}/import`, {
        participants: splitData.participants.map(p => ({
          userId: p.userId,
          share: p.share
        }))
      });
      
      setTransactions(transactions.map(txn => 
        txn.id === selectedTransaction.id ? { ...txn, isImported: true } : txn
      ));
      setShowSplitModal(false);
      setSelectedTransaction(null);
      alert('Transaction imported and split successfully');
    } catch (error) {
      console.error('Error importing transaction:', error);
      alert(error.response?.data?.error || 'Failed to import transaction');
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Bank Accounts</h1>
        <button
          onClick={() => setShowConnectModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Connect Bank</span>
        </button>
      </div>

      {accounts.length === 0 ? (
        <div className="card text-center py-12">
          <Building2 size={48} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No bank accounts connected</h3>
          <p className="text-gray-600 mb-4">
            Connect your bank account to automatically track expenses
          </p>
          <button
            onClick={() => setShowConnectModal(true)}
            className="btn-primary inline-flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Connect Bank Account</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bank Accounts List */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Connected Accounts</h2>
            {accounts.map(account => (
              <div
                key={account.id}
                className={`card cursor-pointer transition-all ${
                  selectedAccount?.id === account.id ? 'ring-2 ring-primary-500' : ''
                }`}
                onClick={() => {
                  setSelectedAccount(account);
                  fetchTransactions(account.id);
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <CreditCard className="text-primary-600" size={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{account.bankName}</h3>
                      <p className="text-sm text-gray-500">****{account.accountNumber}</p>
                      <p className="text-xs text-gray-400 capitalize">{account.accountType}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      disconnectAccount(account.id);
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-2xl font-bold text-gray-900">₹{account.balance.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">Balance</p>
                </div>
              </div>
            ))}
          </div>

          {/* Transactions List */}
          <div className="lg:col-span-2">
            {selectedAccount && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Transactions</h2>
                  <button
                    onClick={() => syncTransactions(selectedAccount.id)}
                    disabled={syncing}
                    className="btn-secondary flex items-center space-x-2"
                  >
                    <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                    <span>{syncing ? 'Syncing...' : 'Sync'}</span>
                  </button>
                </div>

                <div className="card">
                  {transactions.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No transactions found</p>
                      <button
                        onClick={() => syncTransactions(selectedAccount.id)}
                        className="btn-primary mt-4 inline-flex items-center space-x-2"
                      >
                        <RefreshCw size={16} />
                        <span>Sync Transactions</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {transactions.map(txn => (
                        <div
                          key={txn.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <div className={`p-2 rounded-lg ${
                                txn.type === 'debit' ? 'bg-red-100' : 'bg-green-100'
                              }`}>
                                <CreditCard size={16} className={
                                  txn.type === 'debit' ? 'text-red-600' : 'text-green-600'
                                } />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium text-gray-900">{txn.description}</h4>
                                  <p className={`text-lg font-semibold ${
                                    txn.type === 'debit' ? 'text-red-600' : 'text-green-600'
                                  }`}>
                                    {txn.type === 'debit' ? '-' : '+'}₹{txn.amount.toFixed(2)}
                                  </p>
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                  <div>
                                    <span className="text-xs text-gray-500">{txn.date}</span>
                                    <span className="text-xs text-gray-400 ml-2 capitalize">
                                      {txn.category}
                                    </span>
                                  </div>
                                  {txn.type === 'debit' && (
                                    <button
                                      onClick={() => openSplitModal(txn)}
                                      disabled={txn.isImported}
                                      className={`flex items-center space-x-1 text-xs ${
                                        txn.isImported
                                          ? 'text-green-600 cursor-not-allowed'
                                          : 'text-primary-600 hover:text-primary-700'
                                      }`}
                                    >
                                      {txn.isImported ? (
                                        <>
                                          <Check size={14} />
                                          <span>Imported</span>
                                        </>
                                      ) : (
                                        <>
                                          <Download size={14} />
                                          <span>Split & Import</span>
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Connect Bank Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Connect Bank Account</h2>
            <form onSubmit={connectAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder="e.g., HDFC Bank, SBI, ICICI"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  placeholder="Enter account number"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Type
                </label>
                <select
                  className="input-field"
                  value={formData.accountType}
                  onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                >
                  <option value="savings">Savings</option>
                  <option value="current">Current</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IFSC Code (Optional)
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.ifsc}
                  onChange={(e) => setFormData({ ...formData, ifsc: e.target.value })}
                  placeholder="e.g., HDFC0001234"
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  <strong>Demo Mode:</strong> This is a simulated bank integration. 
                  Your actual bank credentials are not required or stored.
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  className="btn-secondary flex-1"
                  disabled={connecting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={connecting}
                >
                  {connecting ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Split & Import Modal */}
      {showSplitModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Split & Import Transaction</h2>
              <button
                onClick={() => setShowSplitModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h3 className="font-semibold text-gray-900">{selectedTransaction.description}</h3>
              <p className="text-2xl font-bold text-red-600 mt-2">₹{selectedTransaction.amount.toFixed(2)}</p>
              <p className="text-sm text-gray-500">{selectedTransaction.date}</p>
            </div>

            <div className="space-y-4">
              {/* Split Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Split Type</label>
                <div className="flex space-x-4">
                  <button
                    onClick={() => handleSplitTypeChange('equal')}
                    className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                      splitData.splitType === 'equal'
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    Split Equally
                  </button>
                  <button
                    onClick={() => handleSplitTypeChange('custom')}
                    className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                      splitData.splitType === 'custom'
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    Custom Amounts
                  </button>
                </div>
              </div>

              {/* Search Users */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add Participants
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Search users by name or email..."
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value);
                      searchUsers(e.target.value);
                    }}
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {searchResults.map(searchUser => (
                        <button
                          key={searchUser.id}
                          onClick={() => addParticipant(searchUser)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-2"
                        >
                          <Users size={16} className="text-gray-500" />
                          <div>
                            <p className="font-medium text-gray-900">{searchUser.name}</p>
                            <p className="text-xs text-gray-500">{searchUser.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Participants List */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Participants ({splitData.participants.length})
                </label>
                <div className="space-y-2">
                  {splitData.participants.map(participant => (
                    <div
                      key={participant.userId}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-600 font-semibold text-sm">
                            {participant.userName[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {participant.userName}
                            {participant.userId === user.id && (
                              <span className="text-xs text-gray-500 ml-2">(You)</span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {splitData.splitType === 'custom' ? (
                            <input
                              type="number"
                              step="0.01"
                              className="input-field w-24 text-right"
                              value={participant.share}
                              onChange={(e) => updateParticipantShare(participant.userId, e.target.value)}
                            />
                          ) : (
                            <span className="text-gray-900 font-semibold">
                              ₹{participant.share.toFixed(2)}
                            </span>
                          )}
                        </div>
                        {participant.userId !== user.id && (
                          <button
                            onClick={() => removeParticipant(participant.userId)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total Summary */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">Total Split:</span>
                    <span className={`font-bold ${
                      Math.abs(splitData.participants.reduce((sum, p) => sum + p.share, 0) - selectedTransaction.amount) < 0.01
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      ₹{splitData.participants.reduce((sum, p) => sum + p.share, 0).toFixed(2)} / ₹{selectedTransaction.amount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowSplitModal(false)}
                  className="btn-secondary flex-1"
                  disabled={importing}
                >
                  Cancel
                </button>
                <button
                  onClick={importTransaction}
                  className="btn-primary flex-1"
                  disabled={importing || Math.abs(splitData.participants.reduce((sum, p) => sum + p.share, 0) - selectedTransaction.amount) > 0.01}
                >
                  {importing ? 'Importing...' : 'Import & Split'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BankAccounts;
