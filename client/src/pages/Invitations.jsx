import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Mail, Phone, User, Send, Check, Clock, Users, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function Invitations() {
  const { user } = useAuth();
  const [tab, setTab] = useState('send');
  const [sentInvitations, setSentInvitations] = useState([]);
  const [receivedInvitations, setReceivedInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    name: '',
    message: ''
  });
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      const [sentRes, receivedRes] = await Promise.all([
        axios.get('/api/invitations/sent'),
        axios.get('/api/invitations/received')
      ]);

      setSentInvitations(sentRes.data);
      setReceivedInvitations(receivedRes.data);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    
    if (!formData.email && !formData.phone && !formData.name) {
      alert('Please provide at least email, phone, or name');
      return;
    }

    setInviting(true);

    try {
      const response = await axios.post('/api/invitations', formData);
      setSentInvitations([...sentInvitations, response.data]);
      setFormData({ email: '', phone: '', name: '', message: '' });
      setShowInviteModal(false);
    } catch (error) {
      console.error('Error sending invitation:', error);
      alert('Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const acceptInvitation = async (invitationId) => {
    try {
      const response = await axios.post(`/api/invitations/${invitationId}/accept`);
      setReceivedInvitations(
        receivedInvitations.map(i => i.id === invitationId ? response.data : i)
      );
    } catch (error) {
      console.error('Error accepting invitation:', error);
      alert('Failed to accept invitation');
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
        <h1 className="text-3xl font-bold text-gray-900">Invitations & Contacts</h1>
        <button
          onClick={() => setShowInviteModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Send Invitation</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-gray-200">
        <button
          onClick={() => setTab('send')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            tab === 'send'
              ? 'text-primary-600 border-primary-600'
              : 'text-gray-600 border-transparent hover:text-gray-900'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Send size={18} />
            <span>Sent ({sentInvitations.length})</span>
          </div>
        </button>
        <button
          onClick={() => setTab('received')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            tab === 'received'
              ? 'text-primary-600 border-primary-600'
              : 'text-gray-600 border-transparent hover:text-gray-900'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Mail size={18} />
            <span>Received ({receivedInvitations.length})</span>
          </div>
        </button>
      </div>

      {/* Sent Invitations */}
      {tab === 'send' && (
        <div className="space-y-4">
          {sentInvitations.length === 0 ? (
            <div className="card text-center py-12">
              <Send size={48} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No invitations sent</h3>
              <p className="text-gray-600 mb-4">
                Invite friends to Smart Split so you can split expenses together
              </p>
              <button
                onClick={() => setShowInviteModal(true)}
                className="btn-primary inline-flex items-center space-x-2"
              >
                <Plus size={20} />
                <span>Send Your First Invitation</span>
              </button>
            </div>
          ) : (
            sentInvitations.map(invitation => (
              <div key={invitation.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="bg-primary-100 text-primary-700 w-12 h-12 rounded-full flex items-center justify-center font-bold">
                        {(invitation.name || invitation.email || invitation.phone).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {invitation.name || invitation.email || invitation.phone}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Invited {new Date(invitation.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1 text-sm">
                      {invitation.email && (
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Mail size={16} />
                          <span>{invitation.email}</span>
                        </div>
                      )}
                      {invitation.phone && (
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Phone size={16} />
                          <span>{invitation.phone}</span>
                        </div>
                      )}
                    </div>

                    {invitation.message && (
                      <p className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-700">
                        "{invitation.message}"
                      </p>
                    )}
                  </div>

                  <div className="ml-4">
                    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
                      invitation.status === 'accepted'
                        ? 'bg-green-100 text-green-700'
                        : invitation.status === 'connected'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {invitation.status === 'accepted' ? (
                        <>
                          <Check size={16} />
                          <span>Accepted</span>
                        </>
                      ) : invitation.status === 'connected' ? (
                        <>
                          <Users size={16} />
                          <span>Connected</span>
                        </>
                      ) : (
                        <>
                          <Clock size={16} />
                          <span>Pending</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Received Invitations */}
      {tab === 'received' && (
        <div className="space-y-4">
          {receivedInvitations.length === 0 ? (
            <div className="card text-center py-12">
              <Mail size={48} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No pending invitations</h3>
              <p className="text-gray-600">
                You'll see invitations here when friends invite you to split expenses
              </p>
            </div>
          ) : (
            receivedInvitations.map(invitation => (
              <div key={invitation.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="bg-blue-100 text-blue-700 w-12 h-12 rounded-full flex items-center justify-center font-bold">
                        {(invitation.invitedByName || invitation.invitedByEmail).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {invitation.invitedByName}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Invited you on {new Date(invitation.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-gray-600">
                      <p className="flex items-center space-x-2">
                        <Mail size={16} />
                        <span>{invitation.invitedByEmail}</span>
                      </p>
                    </div>

                    {invitation.message && (
                      <p className="mt-3 p-3 bg-blue-50 rounded text-sm text-gray-700">
                        "{invitation.message}"
                      </p>
                    )}
                  </div>

                  <div className="ml-4">
                    {invitation.status === 'accepted' ? (
                      <div className="flex items-center space-x-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                        <Check size={16} />
                        <span>Accepted</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => acceptInvitation(invitation.id)}
                        className="btn-primary flex items-center space-x-2"
                      >
                        <Check size={16} />
                        <span>Accept</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Send Invitation</h2>

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center space-x-2">
                    <Mail size={16} />
                    <span>Email Address</span>
                  </div>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-field"
                  placeholder="friend@example.com"
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center space-x-2">
                    <User size={16} />
                    <span>Name</span>
                  </div>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="Full Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message (Optional)
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="input-field"
                  rows="3"
                  placeholder="Hey! Let's split expenses on Smart Split..."
                />
              </div>

              <p className="text-xs text-gray-500">
                Provide at least one contact method (email, phone, or name)
              </p>

              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setFormData({ email: '', phone: '', name: '', message: '' });
                  }}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="flex-1 btn-primary disabled:opacity-50"
                >
                  {inviting ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Invitations;
