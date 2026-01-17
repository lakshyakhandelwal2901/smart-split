import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Plus, TrendingUp, TrendingDown, Users, Receipt, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalOwed: 0,
    totalOwing: 0,
    recentTransactions: [],
    groups: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [transactionsRes, groupsRes, balancesRes] = await Promise.all([
        axios.get('/api/transactions'),
        axios.get('/api/groups'),
        axios.get('/api/settlements/balances')
      ]);

      // Handle both old and new response formats
      let totalOwed = 0;
      let totalOwing = 0;

      if (balancesRes.data.summary) {
        // New format with summary
        totalOwed = balancesRes.data.summary.totalOwed;
        totalOwing = balancesRes.data.summary.totalOwing;
      } else if (Array.isArray(balancesRes.data)) {
        // Old format - array of balances
        balancesRes.data.forEach(balance => {
          if (balance.owedTo === user.id) {
            totalOwed += balance.amount;
          } else if (balance.owedBy === user.id) {
            totalOwing += balance.amount;
          }
        });
      }

      setStats({
        totalOwed,
        totalOwing,
        recentTransactions: transactionsRes.data.slice(0, 5),
        groups: groupsRes.data.slice(0, 4)
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user?.name}!</p>
        </div>
        <Link to="/transactions/add" className="btn-primary flex items-center space-x-2">
          <Plus size={20} />
          <span>Add Transaction</span>
        </Link>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">You Are Owed</p>
              <p className="text-3xl font-bold text-green-700 mt-2">
                ₹{stats.totalOwed.toFixed(2)}
              </p>
            </div>
            <div className="bg-green-500 bg-opacity-20 p-3 rounded-full">
              <TrendingUp className="text-green-700" size={24} />
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">You Owe</p>
              <p className="text-3xl font-bold text-red-700 mt-2">
                ₹{stats.totalOwing.toFixed(2)}
              </p>
            </div>
            <div className="bg-red-500 bg-opacity-20 p-3 rounded-full">
              <TrendingDown className="text-red-700" size={24} />
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-600">Net Balance</p>
              <p className="text-3xl font-bold text-primary-700 mt-2">
                ₹{(stats.totalOwed - stats.totalOwing).toFixed(2)}
              </p>
            </div>
            <div className="bg-primary-500 bg-opacity-20 p-3 rounded-full">
              <Receipt className="text-primary-700" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Recent Transactions</h2>
            <Link to="/transactions" className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center">
              View All <ArrowRight size={16} className="ml-1" />
            </Link>
          </div>

          {stats.recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Receipt size={48} className="mx-auto mb-2 opacity-30" />
              <p>No transactions yet</p>
              <Link to="/transactions/add" className="text-primary-600 hover:text-primary-700 text-sm mt-2 inline-block">
                Add your first transaction
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{transaction.description}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(transaction.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">₹{transaction.amount.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{transaction.category}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Groups */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Your Groups</h2>
            <Link to="/groups" className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center">
              View All <ArrowRight size={16} className="ml-1" />
            </Link>
          </div>

          {stats.groups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users size={48} className="mx-auto mb-2 opacity-30" />
              <p>No groups yet</p>
              <Link to="/groups" className="text-primary-600 hover:text-primary-700 text-sm mt-2 inline-block">
                Create your first group
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.groups.map((group) => (
                <Link
                  key={group.id}
                  to={`/groups/${group.id}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-primary-100 text-primary-700 w-10 h-10 rounded-full flex items-center justify-center font-bold">
                      {group.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{group.name}</p>
                      <p className="text-sm text-gray-500">{group.members.length} members</p>
                    </div>
                  </div>
                  <ArrowRight size={20} className="text-gray-400" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
