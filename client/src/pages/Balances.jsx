import { useState, useEffect } from 'react';
import axios from 'axios';
import { DollarSign, TrendingUp, TrendingDown, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function Balances() {
  const { user } = useAuth();
  const [balances, setBalances] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleData, setSettleData] = useState(null);
  const [settling, setSettling] = useState(false);

  useEffect(() => {
    fetchBalances();
  }, []);

  const fetchBalances = async () => {
    try {
      const response = await axios.get('/api/settlements/balances');
      
      // Handle new API response format {balances: [], summary: {}}
      const balancesData = response.data.balances || response.data;
      setBalances(balancesData);

      // Fetch user details
      const userIds = new Set();
      balancesData.forEach(b => {
        userIds.add(b.user1);
        userIds.add(b.user2);
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
      console.error('Error fetching balances:', error);
    } finally {
      setLoading(false);
    }
  };

  const openSettleModal = (balance) => {
    setSettleData({
      paidTo: balance.owedTo === user.id ? balance.owedBy : balance.owedTo,
      amount: balance.amount.toFixed(2),
      note: ''
    });
    setShowSettleModal(true);
  };

  const settleBalance = async (e) => {
    e.preventDefault();
    setSettling(true);

    try {
      await axios.post('/api/settlements', settleData);
      await fetchBalances();
      setShowSettleModal(false);
      setSettleData(null);
    } catch (error) {
      console.error('Error settling balance:', error);
      alert('Failed to settle balance');
    } finally {
      setSettling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const owedToMe = balances.filter(b => b.owedTo === user.id);
  const iOwe = balances.filter(b => b.owedBy === user.id);
  
  const totalOwed = owedToMe.reduce((sum, b) => sum + b.amount, 0);
  const totalOwing = iOwe.reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Balances</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">You Are Owed</p>
              <p className="text-3xl font-bold text-green-700 mt-2">
                ₹{totalOwed.toFixed(2)}
              </p>
            </div>
            <TrendingUp className="text-green-700" size={32} />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">You Owe</p>
              <p className="text-3xl font-bold text-red-700 mt-2">
                ₹{totalOwing.toFixed(2)}
              </p>
            </div>
            <TrendingDown className="text-red-700" size={32} />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-600">Net Balance</p>
              <p className="text-3xl font-bold text-primary-700 mt-2">
                ₹{(totalOwed - totalOwing).toFixed(2)}
              </p>
            </div>
            <DollarSign className="text-primary-700" size={32} />
          </div>
        </div>
      </div>

      {/* People Who Owe You */}
      {owedToMe.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
            <TrendingUp className="text-green-600" size={24} />
            <span>People Who Owe You</span>
          </h2>
          <div className="space-y-3">
            {owedToMe.map((balance) => {
              const otherUser = users[balance.owedBy];
              
              return (
                <div key={balance.user1 + balance.user2} className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-100">
                  <div className="flex items-center space-x-3">
                    <div className="bg-green-200 text-green-700 w-12 h-12 rounded-full flex items-center justify-center font-bold">
                      {otherUser?.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{otherUser?.name || 'Unknown User'}</p>
                      <p className="text-sm text-gray-600">owes you</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-700">₹{balance.amount.toFixed(2)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* People You Owe */}
      {iOwe.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
            <TrendingDown className="text-red-600" size={24} />
            <span>People You Owe</span>
          </h2>
          <div className="space-y-3">
            {iOwe.map((balance) => {
              const otherUser = users[balance.owedTo];
              
              return (
                <div key={balance.user1 + balance.user2} className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100">
                  <div className="flex items-center space-x-3">
                    <div className="bg-red-200 text-red-700 w-12 h-12 rounded-full flex items-center justify-center font-bold">
                      {otherUser?.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{otherUser?.name || 'Unknown User'}</p>
                      <p className="text-sm text-gray-600">you owe</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center space-x-4">
                    <p className="text-2xl font-bold text-red-700">₹{balance.amount.toFixed(2)}</p>
                    <button
                      onClick={() => openSettleModal(balance)}
                      className="btn-primary flex items-center space-x-2"
                    >
                      <Send size={16} />
                      <span>Settle</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No Balances */}
      {balances.length === 0 && (
        <div className="card text-center py-12">
          <DollarSign size={48} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">All settled up!</h3>
          <p className="text-gray-600">You don't owe anyone, and no one owes you.</p>
        </div>
      )}

      {/* Settle Modal */}
      {showSettleModal && settleData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Settle Balance</h2>
            
            <form onSubmit={settleBalance} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paying To
                </label>
                <div className="input-field bg-gray-50">
                  {users[settleData.paidTo]?.name || 'Unknown User'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  value={settleData.amount}
                  onChange={(e) => setSettleData({ ...settleData, amount: e.target.value })}
                  className="input-field"
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note (Optional)
                </label>
                <textarea
                  value={settleData.note}
                  onChange={(e) => setSettleData({ ...settleData, note: e.target.value })}
                  className="input-field"
                  rows="3"
                  placeholder="Add a note..."
                />
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowSettleModal(false);
                    setSettleData(null);
                  }}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settling}
                  className="flex-1 btn-primary disabled:opacity-50"
                >
                  {settling ? 'Settling...' : 'Settle Balance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Balances;
