import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Plus, X, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function AddTransaction() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'food',
    type: 'expense',
    paidBy: user?.id,
    groupId: '',
    date: new Date().toISOString().split('T')[0],
    participants: [{ userId: user?.id, share: '' }]
  });

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await axios.get('/api/groups');
      setGroups(response.data);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const searchUsers = async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await axios.get(`/api/users/search?query=${query}`);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Auto-calculate equal split when amount changes
    if (name === 'amount' && value) {
      const amount = parseFloat(value);
      const perPerson = amount / formData.participants.length;
      setFormData({
        ...formData,
        amount: value,
        participants: formData.participants.map(p => ({
          ...p,
          share: perPerson.toFixed(2)
        }))
      });
    }
  };

  const addParticipant = (user) => {
    // Check if user already added
    if (formData.participants.some(p => p.userId === user.id)) {
      return;
    }

    const newParticipants = [...formData.participants, { userId: user.id, share: '' }];
    
    // Recalculate equal split
    if (formData.amount) {
      const amount = parseFloat(formData.amount);
      const perPerson = amount / newParticipants.length;
      setFormData({
        ...formData,
        participants: newParticipants.map(p => ({
          ...p,
          share: perPerson.toFixed(2)
        }))
      });
    } else {
      setFormData({ ...formData, participants: newParticipants });
    }

    setSearchQuery('');
    setSearchResults([]);
  };

  const removeParticipant = (userId) => {
    if (formData.participants.length === 1) {
      alert('At least one participant is required');
      return;
    }

    const newParticipants = formData.participants.filter(p => p.userId !== userId);
    
    // Recalculate equal split
    if (formData.amount) {
      const amount = parseFloat(formData.amount);
      const perPerson = amount / newParticipants.length;
      setFormData({
        ...formData,
        participants: newParticipants.map(p => ({
          ...p,
          share: perPerson.toFixed(2)
        }))
      });
    } else {
      setFormData({ ...formData, participants: newParticipants });
    }
  };

  const updateParticipantShare = (userId, share) => {
    setFormData({
      ...formData,
      participants: formData.participants.map(p =>
        p.userId === userId ? { ...p, share } : p
      )
    });
  };

  const splitEqually = () => {
    if (!formData.amount) return;
    
    const amount = parseFloat(formData.amount);
    const perPerson = amount / formData.participants.length;
    
    setFormData({
      ...formData,
      participants: formData.participants.map(p => ({
        ...p,
        share: perPerson.toFixed(2)
      }))
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.description || !formData.amount || formData.participants.length === 0) {
      alert('Please fill in all required fields');
      return;
    }

    const totalShares = formData.participants.reduce((sum, p) => sum + parseFloat(p.share || 0), 0);
    const amount = parseFloat(formData.amount);
    
    if (Math.abs(totalShares - amount) > 0.01) {
      alert('Total shares must equal the transaction amount');
      return;
    }

    setLoading(true);

    try {
      await axios.post('/api/transactions', {
        ...formData,
        amount: parseFloat(formData.amount),
        participants: formData.participants.map(p => ({
          ...p,
          share: parseFloat(p.share)
        })),
        groupId: formData.groupId || null
      });

      navigate('/transactions');
    } catch (error) {
      console.error('Error creating transaction:', error);
      alert('Failed to create transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft size={20} />
        <span>Back</span>
      </button>

      <div className="card">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Add New Transaction</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g., Lunch at restaurant"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="food">Food & Dining</option>
                  <option value="transport">Transport</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="shopping">Shopping</option>
                  <option value="utilities">Utilities</option>
                  <option value="rent">Rent</option>
                  <option value="general">General</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="expense">Expense</option>
                  <option value="cash">Cash</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Group (Optional)
              </label>
              <select
                name="groupId"
                value={formData.groupId}
                onChange={handleChange}
                className="input-field"
              >
                <option value="">No Group</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Participants */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Split With</h3>
              <button
                type="button"
                onClick={splitEqually}
                className="text-sm btn-secondary"
                disabled={!formData.amount}
              >
                Split Equally
              </button>
            </div>

            {/* Search Users */}
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10"
                placeholder="Search users to add..."
              />
              
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {searchResults.map(searchUser => (
                    <button
                      key={searchUser.id}
                      type="button"
                      onClick={() => addParticipant(searchUser)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{searchUser.name}</p>
                        <p className="text-sm text-gray-500">{searchUser.email}</p>
                      </div>
                      <Plus size={20} className="text-primary-600" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Participants List */}
            <div className="space-y-3">
              {formData.participants.map((participant, index) => {
                const participantUser = participant.userId === user?.id 
                  ? user 
                  : searchResults.find(u => u.id === participant.userId);

                return (
                  <div key={participant.userId} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {participant.userId === user?.id ? 'You' : participantUser?.name || 'Unknown User'}
                      </p>
                    </div>
                    <div className="w-32">
                      <input
                        type="number"
                        value={participant.share}
                        onChange={(e) => updateParticipantShare(participant.userId, e.target.value)}
                        className="input-field text-right"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>
                    {formData.participants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeParticipant(participant.userId)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <X size={20} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {formData.amount && (
              <div className="mt-4 p-3 bg-primary-50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Total Amount:</span>
                  <span className="font-semibold text-gray-900">₹{formData.amount}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-700">Total Shares:</span>
                  <span className={`font-semibold ${
                    Math.abs(formData.participants.reduce((sum, p) => sum + parseFloat(p.share || 0), 0) - parseFloat(formData.amount)) > 0.01
                      ? 'text-red-600'
                      : 'text-green-600'
                  }`}>
                    ₹{formData.participants.reduce((sum, p) => sum + parseFloat(p.share || 0), 0).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn-primary disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddTransaction;
