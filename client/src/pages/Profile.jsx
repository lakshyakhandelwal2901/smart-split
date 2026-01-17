import { useState } from 'react';
import axios from 'axios';
import { User, Mail, Phone, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function Profile() {
  const { user, updateUser, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.put('/api/users/me', formData);
      updateUser(response.data);
      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Profile</h1>

      {/* Profile Card */}
      <div className="card">
        <div className="flex items-center space-x-6 mb-6">
          <div className="bg-primary-100 text-primary-700 w-24 h-24 rounded-full flex items-center justify-center font-bold text-4xl">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{user?.name}</h2>
            <p className="text-gray-600">{user?.email}</p>
          </div>
        </div>

        {editing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center space-x-2">
                  <User size={16} />
                  <span>Full Name</span>
                </div>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center space-x-2">
                  <Phone size={16} />
                  <span>Phone Number</span>
                </div>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input-field"
                placeholder="+91 98765 43210"
              />
            </div>

            <div className="flex space-x-4 pt-4">
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setFormData({ name: user?.name || '', phone: user?.phone || '' });
                }}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <User className="text-gray-400" size={20} />
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium text-gray-900">{user?.name}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Mail className="text-gray-400" size={20} />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Phone className="text-gray-400" size={20} />
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium text-gray-900">
                  {user?.phone || 'Not provided'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setEditing(true)}
              className="w-full btn-primary flex items-center justify-center space-x-2"
            >
              <Save size={20} />
              <span>Edit Profile</span>
            </button>
          </div>
        )}
      </div>

      {/* Account Actions */}
      <div className="card">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Account Actions</h3>
        <button
          onClick={logout}
          className="w-full px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium"
        >
          Sign Out
        </button>
      </div>

      {/* App Info */}
      <div className="card bg-gray-50">
        <h3 className="text-lg font-bold text-gray-900 mb-2">About Smart Split</h3>
        <p className="text-gray-600 text-sm mb-3">
          Split expenses with friends, family, and roommates. Track shared expenses and settle balances easily.
        </p>
        <p className="text-gray-500 text-xs">Version 1.0.0</p>
      </div>
    </div>
  );
}

export default Profile;
