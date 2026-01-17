import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Users, Plus, UserPlus, Receipt } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function GroupDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [members, setMembers] = useState({});

  useEffect(() => {
    fetchGroupDetails();
  }, [id]);

  const fetchGroupDetails = async () => {
    try {
      const response = await axios.get(`/api/groups/${id}`);
      setGroup(response.data);

      // Fetch member details
      const memberPromises = response.data.members.map(m =>
        axios.get(`/api/users/${m.userId}`).catch(() => null)
      );
      const memberResponses = await Promise.all(memberPromises);
      
      const membersMap = {};
      memberResponses.forEach(res => {
        if (res?.data) {
          membersMap[res.data.id] = res.data;
        }
      });
      setMembers(membersMap);
    } catch (error) {
      console.error('Error fetching group details:', error);
      alert('Failed to load group');
      navigate('/groups');
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await axios.get(`/api/users/search?query=${query}`);
      setSearchResults(response.data.filter(
        u => !group.members.some(m => m.userId === u.id)
      ));
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (showAddMember) {
        searchUsers(searchQuery);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery, showAddMember]);

  const addMember = async (userId) => {
    try {
      const response = await axios.post(`/api/groups/${id}/members`, { userId });
      setGroup(response.data);
      setShowAddMember(false);
      setSearchQuery('');
      
      // Fetch new member details
      const memberRes = await axios.get(`/api/users/${userId}`);
      setMembers({ ...members, [userId]: memberRes.data });
    } catch (error) {
      console.error('Error adding member:', error);
      alert(error.response?.data?.error || 'Failed to add member');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!group) {
    return null;
  }

  const isAdmin = group.members.find(m => m.userId === user?.id)?.role === 'admin';

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/groups')}
        className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={20} />
        <span>Back to Groups</span>
      </button>

      {/* Group Header */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="bg-primary-100 text-primary-700 w-20 h-20 rounded-full flex items-center justify-center font-bold text-3xl">
              {group.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{group.name}</h1>
              {group.description && (
                <p className="text-gray-600 mt-2">{group.description}</p>
              )}
              <div className="flex items-center space-x-2 mt-3 text-sm text-gray-500">
                <Users size={16} />
                <span>{group.members.length} members</span>
              </div>
            </div>
          </div>
          
          {isAdmin && (
            <button
              onClick={() => setShowAddMember(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <UserPlus size={20} />
              <span>Add Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Balances */}
      {group.balances && Object.keys(group.balances).length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Group Balances</h2>
          <div className="space-y-3">
            {Object.entries(group.balances).map(([userId, balance]) => {
              const member = members[userId];
              if (!member) return null;
              
              return (
                <div key={userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gray-200 w-10 h-10 rounded-full flex items-center justify-center font-bold text-gray-700">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900">
                      {userId === user?.id ? 'You' : member.name}
                    </span>
                  </div>
                  <span className={`font-bold ${balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {balance > 0 ? '+' : ''}₹{balance.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Members */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Members</h2>
        <div className="space-y-3">
          {group.members.map((member) => {
            const memberUser = members[member.userId];
            if (!memberUser) return null;

            return (
              <div key={member.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="bg-primary-100 text-primary-700 w-10 h-10 rounded-full flex items-center justify-center font-bold">
                    {memberUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {member.userId === user?.id ? 'You' : memberUser.name}
                    </p>
                    <p className="text-sm text-gray-500">{memberUser.email}</p>
                  </div>
                </div>
                {member.role === 'admin' && (
                  <span className="px-3 py-1 bg-primary-100 text-primary-700 text-sm rounded-full font-medium">
                    Admin
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Transactions */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Group Transactions</h2>
          <Link
            to="/transactions/add"
            state={{ groupId: group.id }}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Add Expense</span>
          </Link>
        </div>

        {!group.transactions || group.transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Receipt size={48} className="mx-auto mb-2 opacity-30" />
            <p>No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {group.transactions.map((transaction) => {
              const payer = members[transaction.paidBy];
              
              return (
                <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{transaction.description}</p>
                    <p className="text-sm text-gray-500">
                      Paid by {transaction.paidBy === user?.id ? 'You' : payer?.name || 'Unknown'} • {' '}
                      {new Date(transaction.date).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="font-bold text-gray-900">₹{transaction.amount.toFixed(2)}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Add Member</h2>
            
            <div className="space-y-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field"
                placeholder="Search users by name or email..."
                autoFocus
              />

              {searchResults.length > 0 ? (
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {searchResults.map(searchUser => (
                    <button
                      key={searchUser.id}
                      onClick={() => addMember(searchUser.id)}
                      className="w-full p-3 text-left hover:bg-gray-50 rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{searchUser.name}</p>
                        <p className="text-sm text-gray-500">{searchUser.email}</p>
                      </div>
                      <Plus size={20} className="text-primary-600" />
                    </button>
                  ))}
                </div>
              ) : searchQuery.length >= 2 ? (
                <p className="text-center text-gray-500 py-4">No users found</p>
              ) : null}

              <button
                onClick={() => {
                  setShowAddMember(false);
                  setSearchQuery('');
                }}
                className="w-full btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GroupDetail;
