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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="admin-dashboard">
      {/* Admin Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent text-2xl font-bold">
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

      {/* Admin Navigation */}
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
                  activeTab === tab.id ? 'bg-teal-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                }`}
                data-testid={`admin-tab-${tab.id}`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <OverviewTab dashboardData={dashboardData} />
        )}
        {activeTab === 'users' && (
          <UsersTab users={users} onUserAction={handleUserAction} />
        )}
        {activeTab === 'transactions' && (
          <TransactionsTab transactions={transactions} onTransactionAction={handleTransactionAction} />
        )}
        {activeTab === 'settings' && (
          <SettingsTab />
        )}
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ dashboardData }) => {
  if (!dashboardData) return null;

  const stats = [
    {
      title: 'Total Users',
      value: dashboardData.users.total,
      subtext: `${dashboardData.users.pending} pending verification`,
      icon: '👥',
      color: 'blue'
    },
    {
      title: 'Total Transactions',
      value: dashboardData.transactions.total,
      subtext: `${dashboardData.transactions.pending} pending approval`,
      icon: '💸',
      color: 'green'
    },
    {
      title: 'Total Volume',
      value: `$${dashboardData.transactions.total_volume_usd.toFixed(2)}`,
      subtext: `$${dashboardData.transactions.total_fees_usd.toFixed(2)} in fees`,
      icon: '💰',
      color: 'purple'
    },
    {
      title: 'Completed Transfers',
      value: dashboardData.transactions.completed,
      subtext: `${((dashboardData.transactions.completed / dashboardData.transactions.total) * 100 || 0).toFixed(1)}% success rate`,
      icon: '✅',
      color: 'teal'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-2xl">{stat.icon}</div>
              <div className={`px-2 py-1 rounded text-xs font-medium bg-${stat.color}-100 text-${stat.color}-800`}>
                Live
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-800 mb-1">{stat.value}</div>
            <div className="text-sm font-medium text-gray-600 mb-2">{stat.title}</div>
            <div className="text-xs text-gray-500">{stat.subtext}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">⏳</div>
              <div>
                <div className="font-medium text-gray-800">Pending Users</div>
                <div className="text-sm text-gray-600">{dashboardData.users.pending} users awaiting verification</div>
              </div>
            </div>
          </div>
          
          <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">💸</div>
              <div>
                <div className="font-medium text-gray-800">Pending Transactions</div>
                <div className="text-sm text-gray-600">{dashboardData.transactions.pending} transfers to review</div>
              </div>
            </div>
          </div>
          
          <div className="p-4 border border-green-200 rounded-lg bg-green-50">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">🎯</div>
              <div>
                <div className="font-medium text-gray-800">System Status</div>
                <div className="text-sm text-gray-600">All systems operational</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Users Tab Component
const UsersTab = ({ users, onUserAction }) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionNotes, setActionNotes] = useState('');

  const handleAction = async (action) => {
    if (!selectedUser) return;
    await onUserAction(selectedUser.id, action, actionNotes);
    setSelectedUser(null);
    setActionNotes('');
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

        {/* Users Table */}
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
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${\n                      user.status === 'verified' ? 'bg-green-100 text-green-800' :\n                      user.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :\n                      'bg-red-100 text-red-800'\n                    }`} data-testid={`user-status-${user.id}`}>\n                      {user.status.charAt(0).toUpperCase() + user.status.slice(1)}\n                    </span>\n                  </td>\n                  <td className="px-4 py-4 text-sm text-gray-600">\n                    {new Date(user.created_at).toLocaleDateString()}\n                  </td>\n                  <td className="px-4 py-4">\n                    {user.status === 'pending' && (\n                      <div className="flex space-x-2">\n                        <button\n                          onClick={() => setSelectedUser(user)}\n                          className="text-sm bg-teal-600 text-white px-3 py-1 rounded hover:bg-teal-700"\n                          data-testid={`verify-user-${user.id}`}\n                        >\n                          Review\n                        </button>\n                      </div>\n                    )}\n                    {user.status === 'verified' && (\n                      <span className="text-sm text-green-600 font-medium">✓ Active</span>\n                    )}\n                  </td>\n                </tr>\n              ))}\n            </tbody>\n          </table>\n        </div>\n      </div>\n\n      {/* User Action Modal */}\n      {selectedUser && (\n        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">\n          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">\n            <h3 className="text-lg font-bold text-gray-800 mb-4">\n              Review User: {selectedUser.full_name}\n            </h3>\n            \n            <div className="space-y-4 mb-6">\n              <div>\n                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>\n                <div className="text-sm text-gray-800">{selectedUser.phone}</div>\n              </div>\n              <div>\n                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>\n                <div className="text-sm text-gray-800">{selectedUser.email}</div>\n              </div>\n              <div>\n                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>\n                <textarea\n                  value={actionNotes}\n                  onChange={(e) => setActionNotes(e.target.value)}\n                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"\n                  rows="3"\n                  placeholder="Add any notes for the user..."\n                  data-testid="user-action-notes"\n                />\n              </div>\n            </div>\n            \n            <div className="flex space-x-3">\n              <button\n                onClick={() => setSelectedUser(null)}\n                className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-medium hover:bg-gray-300"\n              >\n                Cancel\n              </button>\n              <button\n                onClick={() => handleAction('reject')}\n                className="flex-1 bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700"\n                data-testid="reject-user-btn"\n              >\n                Reject\n              </button>\n              <button\n                onClick={() => handleAction('approve')}\n                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700"\n                data-testid="approve-user-btn"\n              >\n                Approve\n              </button>\n            </div>\n          </div>\n        </div>\n      )}\n    </div>\n  );\n};\n\n// Transactions Tab Component\nconst TransactionsTab = ({ transactions, onTransactionAction }) => {\n  const [selectedTransaction, setSelectedTransaction] = useState(null);\n  const [actionNotes, setActionNotes] = useState('');\n\n  const handleAction = async (action) => {\n    if (!selectedTransaction) return;\n    await onTransactionAction(selectedTransaction.id, action, actionNotes);\n    setSelectedTransaction(null);\n    setActionNotes('');\n  };\n\n  const getStatusColor = (status) => {\n    switch (status) {\n      case 'completed': return 'bg-green-100 text-green-800';\n      case 'approved': return 'bg-blue-100 text-blue-800';\n      case 'pending': return 'bg-yellow-100 text-yellow-800';\n      case 'rejected': return 'bg-red-100 text-red-800';\n      default: return 'bg-gray-100 text-gray-800';\n    }\n  };\n\n  return (\n    <div className=\"space-y-6\">\n      <div className=\"bg-white rounded-xl shadow-sm p-6\">\n        <div className=\"flex justify-between items-center mb-6\">\n          <h3 className=\"text-lg font-bold text-gray-800\">Transaction Management</h3>\n          <div className=\"text-sm text-gray-600\">\n            {transactions.filter(t => t.status === 'pending').length} pending approval\n          </div>\n        </div>\n\n        {/* Transactions Table */}\n        <div className=\"overflow-x-auto\">\n          <table className=\"w-full\">\n            <thead className=\"bg-gray-50\">\n              <tr>\n                <th className=\"px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase\">Order</th>\n                <th className=\"px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase\">User</th>\n                <th className=\"px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase\">Amount</th>\n                <th className=\"px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase\">Status</th>\n                <th className=\"px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase\">Date</th>\n                <th className=\"px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase\">Actions</th>\n              </tr>\n            </thead>\n            <tbody className=\"divide-y divide-gray-200\">\n              {transactions.map((transaction) => (\n                <tr key={transaction.id} className=\"hover:bg-gray-50\">\n                  <td className=\"px-4 py-4\">\n                    <div>\n                      <div className=\"font-medium text-gray-800\" data-testid={`transaction-order-${transaction.id}`}>\n                        {transaction.order_number}\n                      </div>\n                      <div className=\"text-sm text-gray-600\">To: {transaction.recipient_name}</div>\n                    </div>\n                  </td>\n                  <td className=\"px-4 py-4\">\n                    <div>\n                      <div className=\"text-sm text-gray-800\">{transaction.user_name}</div>\n                      <div className=\"text-sm text-gray-600\">{transaction.user_phone}</div>\n                    </div>\n                  </td>\n                  <td className=\"px-4 py-4\">\n                    <div>\n                      <div className=\"font-medium text-gray-800\">${transaction.send_amount}</div>\n                      <div className=\"text-sm text-gray-600\">Fee: ${transaction.fee_amount.toFixed(2)}</div>\n                      <div className=\"text-sm text-teal-600\">₹{transaction.receive_amount.toFixed(2)}</div>\n                    </div>\n                  </td>\n                  <td className=\"px-4 py-4\">\n                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}\n                      data-testid={`transaction-status-${transaction.id}`}>\n                      {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}\n                    </span>\n                  </td>\n                  <td className=\"px-4 py-4 text-sm text-gray-600\">\n                    {new Date(transaction.created_at).toLocaleDateString()}\n                  </td>\n                  <td className=\"px-4 py-4\">\n                    {transaction.status === 'pending' && (\n                      <button\n                        onClick={() => setSelectedTransaction(transaction)}\n                        className=\"text-sm bg-teal-600 text-white px-3 py-1 rounded hover:bg-teal-700\"\n                        data-testid={`review-transaction-${transaction.id}`}\n                      >\n                        Review\n                      </button>\n                    )}\n                    {transaction.status === 'approved' && (\n                      <button\n                        onClick={() => onTransactionAction(transaction.id, 'complete', 'Transfer completed')}\n                        className=\"text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700\"\n                        data-testid={`complete-transaction-${transaction.id}`}\n                      >\n                        Complete\n                      </button>\n                    )}\n                    {transaction.status === 'completed' && (\n                      <span className=\"text-sm text-green-600 font-medium\">✓ Done</span>\n                    )}\n                  </td>\n                </tr>\n              ))}\n            </tbody>\n          </table>\n        </div>\n      </div>\n\n      {/* Transaction Action Modal */}\n      {selectedTransaction && (\n        <div className=\"fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50\">\n          <div className=\"bg-white rounded-xl shadow-xl p-6 w-full max-w-lg\">\n            <h3 className=\"text-lg font-bold text-gray-800 mb-4\">\n              Review Transaction: {selectedTransaction.order_number}\n            </h3>\n            \n            <div className=\"space-y-4 mb-6\">\n              <div className=\"grid grid-cols-2 gap-4\">\n                <div>\n                  <label className=\"block text-sm font-medium text-gray-700 mb-1\">Sender</label>\n                  <div className=\"text-sm text-gray-800\">{selectedTransaction.user_name}</div>\n                </div>\n                <div>\n                  <label className=\"block text-sm font-medium text-gray-700 mb-1\">Recipient</label>\n                  <div className=\"text-sm text-gray-800\">{selectedTransaction.recipient_name}</div>\n                </div>\n              </div>\n              \n              <div className=\"grid grid-cols-3 gap-4\">\n                <div>\n                  <label className=\"block text-sm font-medium text-gray-700 mb-1\">Send Amount</label>\n                  <div className=\"text-sm text-gray-800\">${selectedTransaction.send_amount}</div>\n                </div>\n                <div>\n                  <label className=\"block text-sm font-medium text-gray-700 mb-1\">Fee</label>\n                  <div className=\"text-sm text-gray-800\">${selectedTransaction.fee_amount.toFixed(2)}</div>\n                </div>\n                <div>\n                  <label className=\"block text-sm font-medium text-gray-700 mb-1\">Recipient Gets</label>\n                  <div className=\"text-sm text-teal-600\">₹{selectedTransaction.receive_amount.toFixed(2)}</div>\n                </div>\n              </div>\n              \n              {selectedTransaction.payment_reference && (\n                <div>\n                  <label className=\"block text-sm font-medium text-gray-700 mb-1\">Payment Reference</label>\n                  <div className=\"text-sm text-gray-800\">{selectedTransaction.payment_reference}</div>\n                </div>\n              )}\n              \n              <div>\n                <label className=\"block text-sm font-medium text-gray-700 mb-1\">Admin Notes</label>\n                <textarea\n                  value={actionNotes}\n                  onChange={(e) => setActionNotes(e.target.value)}\n                  className=\"w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent\"\n                  rows=\"3\"\n                  placeholder=\"Add notes for this transaction...\"\n                  data-testid=\"transaction-action-notes\"\n                />\n              </div>\n            </div>\n            \n            <div className=\"flex space-x-3\">\n              <button\n                onClick={() => setSelectedTransaction(null)}\n                className=\"flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-medium hover:bg-gray-300\"\n              >\n                Cancel\n              </button>\n              <button\n                onClick={() => handleAction('reject')}\n                className=\"flex-1 bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700\"\n                data-testid=\"reject-transaction-btn\"\n              >\n                Reject\n              </button>\n              <button\n                onClick={() => handleAction('approve')}\n                className=\"flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700\"\n                data-testid=\"approve-transaction-btn\"\n              >\n                Approve\n              </button>\n            </div>\n          </div>\n        </div>\n      )}\n    </div>\n  );\n};\n\n// Settings Tab Component\nconst SettingsTab = () => {\n  return (\n    <div className=\"space-y-6\">\n      <div className=\"bg-white rounded-xl shadow-sm p-6\">\n        <h3 className=\"text-lg font-bold text-gray-800 mb-6\">System Settings</h3>\n        \n        <div className=\"space-y-6\">\n          {/* Exchange Rate Settings */}\n          <div className=\"border border-gray-200 rounded-lg p-4\">\n            <h4 className=\"font-medium text-gray-800 mb-3\">Exchange Rate Configuration</h4>\n            <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">\n              <div>\n                <label className=\"block text-sm font-medium text-gray-700 mb-2\">USD to INR Rate</label>\n                <div className=\"px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg\">₹87.00</div>\n              </div>\n              <div>\n                <label className=\"block text-sm font-medium text-gray-700 mb-2\">Transaction Fee</label>\n                <div className=\"px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg\">7%</div>\n              </div>\n            </div>\n            <p className=\"text-sm text-gray-600 mt-3\">\n              Exchange rates and fees are currently fixed. Contact system administrator for updates.\n            </p>\n          </div>\n          \n          {/* Admin Credentials */}\n          <div className=\"border border-gray-200 rounded-lg p-4\">\n            <h4 className=\"font-medium text-gray-800 mb-3\">Admin Access</h4>\n            <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">\n              <div>\n                <label className=\"block text-sm font-medium text-gray-700 mb-2\">Admin Phone</label>\n                <div className=\"px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg\">07657927838</div>\n              </div>\n              <div>\n                <label className=\"block text-sm font-medium text-gray-700 mb-2\">Admin PIN</label>\n                <div className=\"px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg\">****</div>\n              </div>\n            </div>\n            <p className=\"text-sm text-gray-600 mt-3\">\n              Admin credentials are automatically verified during registration.\n            </p>\n          </div>\n          \n          {/* System Information */}\n          <div className=\"border border-gray-200 rounded-lg p-4\">\n            <h4 className=\"font-medium text-gray-800 mb-3\">System Information</h4>\n            <div className=\"space-y-2 text-sm\">\n              <div className=\"flex justify-between\">\n                <span className=\"text-gray-600\">Platform:</span>\n                <span className=\"text-gray-800\">Mula-wave Money Transfer</span>\n              </div>\n              <div className=\"flex justify-between\">\n                <span className=\"text-gray-600\">Version:</span>\n                <span className=\"text-gray-800\">1.0.0</span>\n              </div>\n              <div className=\"flex justify-between\">\n                <span className=\"text-gray-600\">Route:</span>\n                <span className=\"text-gray-800\">Zimbabwe → India</span>\n              </div>\n              <div className=\"flex justify-between\">\n                <span className=\"text-gray-600\">Status:</span>\n                <span className=\"text-green-600\">✓ Operational</span>\n              </div>\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n  );\n};\n\nexport default AdminDashboard;\nexport { useAuth };"