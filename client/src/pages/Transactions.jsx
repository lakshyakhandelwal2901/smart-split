import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Plus, Search, Filter, Receipt, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [users, setUsers] = useState({});

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [searchQuery, filterType, transactions]);

  const fetchTransactions = async () => {
    try {
      const response = await axios.get('/api/transactions');
      setTransactions(response.data);
      
      // Fetch user details for all involved users
      const userIds = new Set();
      response.data.forEach(t => {
        userIds.add(t.paidBy);
        t.participants.forEach(p => userIds.add(p.userId));
      });

      const userPromises = Array.from(userIds).map(id => 
        axios.get(`/api/users/${id}`).catch(() => null)
      );
      const userResponses = await Promise.all(userPromises);
      
      const usersMap = {};
      userResponses.forEach(res => {
        if (res?.data) {
          usersMap[res.data.id] = res.data;
        }
      });
      setUsers(usersMap);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = () => {
    let filtered = transactions;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Type filter
    if (filterType !== 'all') {
      if (filterType === 'paid') {
        filtered = filtered.filter(t => t.paidBy === user.id);
      } else if (filterType === 'involved') {
        filtered = filtered.filter(t => t.participants.some(p => p.userId === user.id));
      }
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    setFilteredTransactions(filtered);
  };

  const deleteTransaction = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    try {
      await axios.delete(`/api/transactions/${id}`);
      setTransactions(transactions.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Failed to delete transaction');
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
        <Link to="/transactions/add" className="btn-primary flex items-center space-x-2">
          <Plus size={20} />
          <span>Add Transaction</span>
        </Link>
      </div>

      {/* Search and Filter */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input-field pl-10 pr-8 appearance-none"
            >
              <option value="all">All Transactions</option>
              <option value="paid">I Paid</option>
              <option value="involved">I'm Involved</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <div className="card text-center py-12">
          <Receipt size={48} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
          <p className="text-gray-600 mb-4">
            {searchQuery || filterType !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Start by adding your first transaction'}
          </p>
          <Link to="/transactions/add" className="btn-primary inline-flex items-center space-x-2">
            <Plus size={20} />
            <span>Add Transaction</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTransactions.map((transaction) => {
            const isPayer = transaction.paidBy === user.id;
            const myShare = transaction.participants.find(p => p.userId === user.id)?.share || 0;
            const payer = users[transaction.paidBy];

            return (
              <div key={transaction.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {transaction.description}
                        </h3>
                        <div className="flex items-center space-x-3 mt-1">
                          <span className="text-sm text-gray-500">
                            {new Date(transaction.date).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                            {transaction.category}
                          </span>
                          <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
                            {transaction.type}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">
                          ₹{transaction.amount.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <span className="text-gray-600">Paid by: </span>
                          <span className="font-medium text-gray-900">
                            {isPayer ? 'You' : payer?.name || 'Unknown'}
                          </span>
                        </div>
                        <div>
                          {isPayer ? (
                            <span className="text-green-600 font-medium">
                              You paid ₹{transaction.amount.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-red-600 font-medium">
                              Your share: ₹{myShare.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>

                      {transaction.participants.length > 1 && (
                        <div className="mt-2 text-sm text-gray-600">
                          <span>Split with {transaction.participants.length} people</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {transaction.createdBy === user.id && (
                    <button
                      onClick={() => deleteTransaction(transaction.id)}
                      className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete transaction"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Transactions;
