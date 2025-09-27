import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../App';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState(null);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [dashboardRes, usersRes, transactionsRes] = await Promise.all([
        axios.get('/admin/dashboard'),
        axios.get('/admin/users'),
        axios.get('/admin/transactions')
      ]);
      
      setDashboardData(dashboardRes.data);
      setUsers(usersRes.data);
      setTransactions(transactionsRes.data);
    } catch (error) {
      toast.error('Failed to load admin data');
      console.error('Admin data fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (userId, action, notes = '') => {
    try {
      await axios.post(`/admin/users/${userId}/verify`, {
        action,
        notes
      });
      toast.success(`User ${action}d successfully`);
      fetchData();
    } catch (error) {
      toast.error(`Failed to ${action} user`);
    }
  };

  const handleTransactionAction = async (transactionId, action, notes = '') => {
    try {
      await axios.post(`/admin/transactions/${transactionId}/update`, {
        action,
        notes
      });
      toast.success(`Transaction ${action}d successfully`);
      fetchData();
    } catch (error) {
      toast.error(`Failed to ${action} transaction`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="admin-dashboard">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-600 to-slate-800 bg-clip-text text-transparent text-2xl font-bold">
                Mula-wave Admin
              </div>
              <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-medium">
                ADMIN PANEL
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user.full_name}</span>
              <button
                onClick={logout}
                className="text-sm text-red-600 hover:underline"
                data-testid="admin-logout-btn"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm p-1 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-1">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'users', label: 'User Management', icon: '👥' },
              { id: 'transactions', label: 'Transactions', icon: '💸' },
              { id: 'settings', label: 'Settings', icon: '⚙️' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 ${
                  activeTab === tab.id ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                }`}
                data-testid={`admin-tab-${tab.id}`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'overview' && <OverviewTab dashboardData={dashboardData} />}
        {activeTab === 'users' && <UsersTab users={users} onUserAction={handleUserAction} fetchData={fetchData} />}
        {activeTab === 'transactions' && <TransactionsTab transactions={transactions} onTransactionAction={handleTransactionAction} />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
};

const OverviewTab = ({ dashboardData }) => {
  if (!dashboardData) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-2xl">👥</div>
            <div className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">Live</div>
          </div>
          <div className="text-2xl font-bold text-gray-800 mb-1">{dashboardData.users.total}</div>
          <div className="text-sm font-medium text-gray-600 mb-2">Total Users</div>
          <div className="text-xs text-gray-500">{dashboardData.users.pending} pending verification</div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-2xl">💸</div>
            <div className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">Live</div>
          </div>
          <div className="text-2xl font-bold text-gray-800 mb-1">{dashboardData.transactions.total}</div>
          <div className="text-sm font-medium text-gray-600 mb-2">Total Transactions</div>
          <div className="text-xs text-gray-500">{dashboardData.transactions.pending} pending approval</div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-2xl">💰</div>
            <div className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">Live</div>
          </div>
          <div className="text-2xl font-bold text-gray-800 mb-1">${dashboardData.transactions.total_volume_usd.toFixed(2)}</div>
          <div className="text-sm font-medium text-gray-600 mb-2">Total Volume</div>
          <div className="text-xs text-gray-500">${dashboardData.transactions.total_fees_usd.toFixed(2)} in fees</div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-2xl">✅</div>
            <div className="px-2 py-1 rounded text-xs font-medium bg-teal-100 text-teal-800">Live</div>
          </div>
          <div className="text-2xl font-bold text-gray-800 mb-1">{dashboardData.transactions.completed}</div>
          <div className="text-sm font-medium text-gray-600 mb-2">Completed Transfers</div>
          <div className="text-xs text-gray-500">
            {((dashboardData.transactions.completed / dashboardData.transactions.total) * 100 || 0).toFixed(1)}% success rate
          </div>
        </div>
      </div>
    </div>
  );
};

const UsersTab = ({ users, onUserAction, fetchData }) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionNotes, setActionNotes] = useState('');
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageData, setMessageData] = useState({ recipient_id: '', subject: '', message: '' });
  const [sendingMessage, setSendingMessage] = useState(false);

  const handleAction = async (action) => {
    if (!selectedUser) return;
    await onUserAction(selectedUser.id, action, actionNotes);
    setSelectedUser(null);
    setActionNotes('');
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    setSendingMessage(true);
    try {
      await axios.post('/admin/send-message', messageData);
      toast.success(`Message sent to ${users.find(u => u.id === messageData.recipient_id)?.full_name}`);
      setShowMessageModal(false);
      setMessageData({ recipient_id: '', subject: '', message: '' });
      fetchData();
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-800">User Management</h3>
          <div className="text-sm text-gray-600">
            {users.filter(u => u.status === 'pending').length} pending verification
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registered</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div>
                      <div className="font-medium text-gray-800" data-testid={`user-name-${user.id}`}>
                        {user.full_name}
                      </div>
                      <div className="text-sm text-gray-600">ID: {user.id.slice(0, 8)}...</div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <div className="text-sm text-gray-800">{user.phone}</div>
                      <div className="text-sm text-gray-600">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.status === 'verified' ? 'bg-green-100 text-green-800' :
                      user.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`} data-testid={`user-status-${user.id}`}>
                      {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex space-x-2">
                      {user.status === 'pending' && (
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                          data-testid={`verify-user-${user.id}`}
                        >
                          Review
                        </button>
                      )}
                      {user.status === 'verified' && (
                        <span className="text-sm text-green-600 font-medium">✓ Active</span>
                      )}
                      <button
                        onClick={() => {
                          setMessageData({ recipient_id: user.id, subject: '', message: '' });
                          setShowMessageModal(true);
                        }}
                        className="text-sm bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700"
                        data-testid={`message-user-${user.id}`}
                      >
                        📧 Message
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              Review User: {selectedUser.full_name}
            </h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <div className="text-sm text-gray-800">{selectedUser.phone}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="text-sm text-gray-800">{selectedUser.email}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="Add any notes for the user..."
                  data-testid="user-action-notes"
                />
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setSelectedUser(null)}
                className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-medium hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction('reject')}
                className="flex-1 bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700"
                data-testid="reject-user-btn"
              >
                Reject
              </button>
              <button
                onClick={() => handleAction('approve')}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700"
                data-testid="approve-user-btn"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              Send Message to {users.find(u => u.id === messageData.recipient_id)?.full_name}
            </h3>
            
            <form onSubmit={handleSendMessage} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={messageData.subject}
                  onChange={(e) => setMessageData({ ...messageData, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Message subject..."
                  required
                  data-testid="message-subject"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={messageData.message}
                  onChange={(e) => setMessageData({ ...messageData, message: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="4"
                  placeholder="Type your message here..."
                  required
                  data-testid="message-content"
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowMessageModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-medium hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingMessage}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                  data-testid="send-message-btn"
                >
                  {sendingMessage ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const TransactionsTab = ({ transactions, onTransactionAction }) => {
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [actionNotes, setActionNotes] = useState('');

  const handleAction = async (action) => {
    if (!selectedTransaction) return;
    await onTransactionAction(selectedTransaction.id, action, actionNotes);
    setSelectedTransaction(null);
    setActionNotes('');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-800">Transaction Management</h3>
          <div className="text-sm text-gray-600">
            {transactions.filter(t => t.status === 'pending').length} pending approval
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div>
                      <div className="font-medium text-gray-800" data-testid={`transaction-order-${transaction.id}`}>
                        {transaction.order_number}
                      </div>
                      <div className="text-sm text-gray-600">
                        {transaction.transfer_route === 'zim_to_india' ? '🇿🇼 → 🇮🇳' : '🇮🇳 → 🇿🇼'} To: {transaction.recipient_name}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <div className="text-sm text-gray-800">{transaction.user_name}</div>
                      <div className="text-sm text-gray-600">{transaction.user_phone}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <div className="font-medium text-gray-800">
                        {transaction.send_currency || 'USD'} {transaction.send_amount}
                      </div>
                      <div className="text-sm text-gray-600">
                        Fee: {transaction.send_currency || 'USD'} {transaction.fee_amount.toFixed(2)}
                        {transaction.ecocash_fee > 0 && ` + USD ${transaction.ecocash_fee.toFixed(2)}`}
                      </div>
                      <div className="text-sm text-blue-600">
                        {transaction.receive_currency || 'INR'} {transaction.receive_amount.toFixed(2)}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}
                      data-testid={`transaction-status-${transaction.id}`}>
                      {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">
                    {new Date(transaction.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4">
                    {transaction.status === 'pending' && (
                      <button
                        onClick={() => setSelectedTransaction(transaction)}
                        className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                        data-testid={`review-transaction-${transaction.id}`}
                      >
                        Review
                      </button>
                    )}
                    {transaction.status === 'approved' && (
                      <button
                        onClick={() => onTransactionAction(transaction.id, 'complete', 'Transfer completed')}
                        className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                        data-testid={`complete-transaction-${transaction.id}`}
                      >
                        Complete
                      </button>
                    )}
                    {transaction.status === 'completed' && (
                      <span className="text-sm text-green-600 font-medium">✓ Done</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              Review Transaction: {selectedTransaction.order_number}
            </h3>
            
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sender</label>
                  <div className="text-sm text-gray-800">{selectedTransaction.user_name}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recipient</label>
                  <div className="text-sm text-gray-800">{selectedTransaction.recipient_name}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Send Amount</label>
                  <div className="text-sm text-gray-800">
                    {selectedTransaction.send_currency || 'USD'} {selectedTransaction.send_amount}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fees</label>
                  <div className="text-sm text-gray-800">
                    {selectedTransaction.send_currency || 'USD'} {selectedTransaction.fee_amount.toFixed(2)}
                    {selectedTransaction.ecocash_fee > 0 && (
                      <div className="text-xs text-amber-600">+USD {selectedTransaction.ecocash_fee.toFixed(2)} EcoCash</div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Gets</label>
                  <div className="text-sm text-blue-600">
                    {selectedTransaction.receive_currency || 'INR'} {selectedTransaction.receive_amount.toFixed(2)}
                  </div>
                </div>
              </div>
              
              {selectedTransaction.payment_reference && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Reference</label>
                  <div className="text-sm text-gray-800">{selectedTransaction.payment_reference}</div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes</label>
                <textarea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="Add notes for this transaction..."
                  data-testid="transaction-action-notes"
                />
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setSelectedTransaction(null)}
                className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-medium hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction('reject')}
                className="flex-1 bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700"
                data-testid="reject-transaction-btn"
              >
                Reject
              </button>
              <button
                onClick={() => handleAction('approve')}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700"
                data-testid="approve-transaction-btn"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SettingsTab = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    zim_to_india_rate: 87.0,
    india_to_zim_rate: 90.0,
    transfer_fee_percentage: 7.0,
    ecocash_fee_percentage: 5.0
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get('/admin/settings');
      setSettings(response.data);
      setFormData({
        zim_to_india_rate: response.data.zim_to_india_rate,
        india_to_zim_rate: response.data.india_to_zim_rate,
        transfer_fee_percentage: response.data.transfer_fee_percentage,
        ecocash_fee_percentage: response.data.ecocash_fee_percentage
      });
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post('/admin/settings', formData);
      toast.success('Settings updated successfully');
      fetchSettings();
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-800">System Settings</h3>
          <div className="text-sm text-gray-500">
            Last updated: {settings?.updated_at ? new Date(settings.updated_at).toLocaleString() : 'Never'}
          </div>
        </div>
        
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Exchange Rate Settings */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-800 mb-4">Exchange Rate Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zimbabwe → India Rate (INR per USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.zim_to_india_rate}
                  onChange={(e) => setFormData({ ...formData, zim_to_india_rate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  data-testid="zim-to-india-rate"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  India → Zimbabwe Rate (INR per USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.india_to_zim_rate}
                  onChange={(e) => setFormData({ ...formData, india_to_zim_rate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  data-testid="india-to-zim-rate"
                />
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p><strong>Zimbabwe → India:</strong> USD amount × {formData.zim_to_india_rate} - {formData.transfer_fee_percentage}% fee</p>
              <p><strong>India → Zimbabwe:</strong> INR amount ÷ {formData.india_to_zim_rate} - {formData.transfer_fee_percentage}% fee</p>
            </div>
          </div>

          {/* Fee Settings */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-800 mb-4">Fee Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transfer Fee (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.transfer_fee_percentage}
                  onChange={(e) => setFormData({ ...formData, transfer_fee_percentage: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  data-testid="transfer-fee"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  EcoCash Fee (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.ecocash_fee_percentage}
                  onChange={(e) => setFormData({ ...formData, ecocash_fee_percentage: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  data-testid="ecocash-fee"
                />
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              EcoCash fee applies only to India → Zimbabwe transfers when EcoCash is selected as payout method.
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              data-testid="save-settings-btn"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminDashboard;