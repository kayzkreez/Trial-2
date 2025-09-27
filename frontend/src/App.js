import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import '@/App.css';

// Get backend URL from environment
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Configure axios defaults
axios.defaults.baseURL = API;

// Auth Context
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setLoading(false);
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export useAuth for AdminDashboard
export { useAuth };

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/auth" />;
};

// Admin Route Component
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return user && user.is_admin ? children : <Navigate to="/dashboard" />;
};

// Welcome Screen
const WelcomeScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate(user.is_admin ? '/admin' : '/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          {/* Logo and Branding */}
          <div className="text-center mb-12">
            <div className="bg-gradient-to-r from-blue-600 to-slate-800 bg-clip-text text-transparent text-4xl font-bold mb-4">
              Mula-wave
            </div>
            <p className="text-gray-600 text-lg font-medium">
              Bridging the financial gap, connecting global minds all in one wave
            </p>
          </div>

          {/* Hero Section */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🌊</div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                Send Money to India
              </h1>
              <p className="text-gray-600">
                Fast, secure transfers from Zimbabwe to India for students
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center space-x-3 p-3 bg-teal-50 rounded-lg">
                <div className="text-2xl">💰</div>
                <div>
                  <div className="font-semibold text-gray-800">Great Exchange Rate</div>
                  <div className="text-sm text-gray-600">₹87 per USD</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl">⚡</div>
                <div>
                  <div className="font-semibold text-gray-800">Fast Transfers</div>
                  <div className="text-sm text-gray-600">Same day processing</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-indigo-50 rounded-lg">
                <div className="text-2xl">🔒</div>
                <div>
                  <div className="font-semibold text-gray-800">Secure & Safe</div>
                  <div className="text-sm text-gray-600">Bank-level security</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/auth')}
              className="w-full bg-gradient-to-r from-blue-600 to-slate-700 text-white py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              data-testid="get-started-btn"
            >
              Get Started
            </button>
          </div>

          {/* Footer */}
          <div className="text-center text-gray-500 text-sm">
            <p>Trusted by students across Zimbabwe 🇿🇼 → 🇮🇳</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Authentication Screen
const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    phone: '',
    pin: '',
    full_name: '',
    email: '',
    date_of_birth: '',
    address: '',
    city: ''
  });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post('/login', {
        phone: formData.phone,
        pin: formData.pin
      });
      
      login(response.data.access_token, response.data.user);
      toast.success('Login successful!');
      navigate(response.data.user.is_admin ? '/admin' : '/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post('/register', formData);
      toast.success('Registration successful! Please wait for admin verification.');
      setIsLogin(true);
      setStep(1);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <button
              onClick={() => navigate('/')}
              className="text-blue-600 text-sm font-medium mb-4 hover:underline"
            >
              ← Back to Home
            </button>
            <div className="bg-gradient-to-r from-blue-600 to-slate-800 bg-clip-text text-transparent text-3xl font-bold mb-2">
              Mula-wave
            </div>
            <p className="text-gray-600">
              {isLogin ? 'Welcome back!' : 'Create your account'}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Tab Selection */}
            <div className="flex mb-8 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                  isLogin ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
                }`}
                data-testid="login-tab"
              >
                Login
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                  !isLogin ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
                }`}
                data-testid="register-tab"
              >
                Register
              </button>
            </div>

            {isLogin ? (
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. 0777123456"
                    required
                    data-testid="phone-input"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PIN
                  </label>
                  <input
                    type="password"
                    name="pin"
                    value={formData.pin}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your 4-digit PIN"
                    maxLength="4"
                    required
                    data-testid="pin-input"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-teal-600 to-blue-600 text-white py-4 rounded-xl font-semibold disabled:opacity-50 hover:shadow-lg transition-all duration-200"
                  data-testid="login-submit-btn"
                >
                  {loading ? 'Logging in...' : 'Login'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-6">
                {step === 1 && (
                  <>
                    <div className="text-center mb-6">
                      <div className="text-sm text-gray-500">Step 1 of 2</div>
                      <div className="font-medium">Personal Information</div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Full Name
                        </label>
                        <input
                          type="text"
                          name="full_name"
                          value={formData.full_name}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          data-testid="fullname-input"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          data-testid="reg-phone-input"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          data-testid="email-input"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          name="date_of_birth"
                          value={formData.date_of_birth}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          data-testid="dob-input"
                        />
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="w-full bg-gradient-to-r from-teal-600 to-blue-600 text-white py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                      data-testid="next-step-btn"
                    >
                      Next Step
                    </button>
                  </>
                )}
                
                {step === 2 && (
                  <>
                    <div className="text-center mb-6">
                      <div className="text-sm text-gray-500">Step 2 of 2</div>
                      <div className="font-medium">Address & Security</div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Address
                        </label>
                        <input
                          type="text"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          data-testid="address-input"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          City
                        </label>
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          data-testid="city-input"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Create PIN (4 digits)
                        </label>
                        <input
                          type="password"
                          name="pin"
                          value={formData.pin}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter 4-digit PIN"
                          maxLength="4"
                          required
                          data-testid="reg-pin-input"
                        />
                      </div>
                    </div>
                    
                    <div className="flex space-x-4">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="flex-1 bg-gray-200 text-gray-800 py-4 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-200"
                        data-testid="back-btn"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-gradient-to-r from-teal-600 to-blue-600 text-white py-4 rounded-xl font-semibold disabled:opacity-50 hover:shadow-lg transition-all duration-200"
                        data-testid="register-submit-btn"
                      >
                        {loading ? 'Creating...' : 'Create Account'}
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Dashboard Screen (User)
const Dashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('send');
  const [recipients, setRecipients] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [recipientsRes, transactionsRes, notificationsRes] = await Promise.all([
        axios.get('/recipients'),
        axios.get('/transactions'),
        axios.get('/notifications')
      ]);
      
      setRecipients(recipientsRes.data);
      setTransactions(transactionsRes.data);
      setNotifications(notificationsRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
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
    <div className="min-h-screen bg-gray-50" data-testid="user-dashboard">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent text-2xl font-bold">
                Mula-wave
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                user.status === 'verified' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {user.status === 'verified' ? '✓ Verified' : 'Pending Verification'}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Hi, {user.full_name}</span>
              <button
                onClick={logout}
                className="text-sm text-red-600 hover:underline"
                data-testid="logout-btn"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Warning */}
      {user.status !== 'verified' && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-yellow-800">
              <strong>Account Verification Pending:</strong> Your account is under review. You'll be able to send money once verified.
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t md:hidden">
          <div className="flex">
            {[
              { id: 'send', label: 'Send', icon: '💸' },
              { id: 'recipients', label: 'Recipients', icon: '👥' },
              { id: 'history', label: 'History', icon: '📋' },
              { id: 'profile', label: 'Profile', icon: '👤' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 text-center ${
                  activeTab === tab.id ? 'text-teal-600 bg-teal-50' : 'text-gray-600'
                }`}
              >
                <div className="text-xl">{tab.icon}</div>
                <div className="text-xs">{tab.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:block mb-8">
          <div className="bg-white rounded-xl shadow-sm p-1">
            <div className="flex space-x-1">
              {[
                { id: 'send', label: 'Send Money', icon: '💸' },
                { id: 'recipients', label: 'Recipients', icon: '👥' },
                { id: 'history', label: 'Transaction History', icon: '📋' },
                { id: 'profile', label: 'Profile', icon: '👤' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 ${
                    activeTab === tab.id ? 'bg-teal-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="pb-20 md:pb-0">
          {activeTab === 'send' && <SendMoneyTab user={user} recipients={recipients} onSuccess={fetchData} />}
          {activeTab === 'recipients' && <RecipientsTab recipients={recipients} onUpdate={fetchData} />}
          {activeTab === 'history' && <TransactionHistoryTab transactions={transactions} />}
          {activeTab === 'profile' && <ProfileTab user={user} notifications={notifications} />}
        </div>
      </div>
    </div>
  );
};

// Send Money Tab Component
const SendMoneyTab = ({ user, recipients, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    recipient_id: '',
    send_amount: '',
    payout_method: 'cash_pickup',
    payment_reference: ''
  });
  const [rateData, setRateData] = useState(null);
  const [loading, setLoading] = useState(false);

  const calculateRate = async (amount) => {
    if (!amount || amount <= 0) return;
    try {
      const response = await axios.post('/calculate-rate', { send_amount: parseFloat(amount) });
      setRateData(response.data);
    } catch (error) {
      console.error('Rate calculation failed:', error);
    }
  };

  const handleAmountChange = (e) => {
    const amount = e.target.value;
    setFormData({ ...formData, send_amount: amount });
    calculateRate(amount);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (user.status !== 'verified') {
      toast.error('Account verification required to send money');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post('/transactions', formData);
      toast.success(`Transfer order ${response.data.order_number} created successfully!`);
      setStep(1);
      setFormData({ recipient_id: '', send_amount: '', payout_method: 'cash_pickup', payment_reference: '' });
      setRateData(null);
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Send Money to India 🇮🇳</h2>
        
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount to Send (USD)
              </label>
              <input
                type="number"
                value={formData.send_amount}
                onChange={handleAmountChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-lg"
                placeholder="100.00"
                min="1"
                step="0.01"
                data-testid="send-amount-input"
              />
            </div>
            
            {rateData && (
              <div className="bg-teal-50 rounded-lg p-4">
                <h3 className="font-medium text-teal-800 mb-3">Transfer Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>You send:</span>
                    <span className="font-medium">${rateData.send_amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transfer fee (7%):</span>
                    <span className="font-medium">${rateData.fee_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Exchange rate:</span>
                    <span className="font-medium">₹{rateData.exchange_rate}/USD</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between text-base">
                    <span className="font-medium">Recipient gets:</span>
                    <span className="font-bold text-teal-600">₹{rateData.receive_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
            
            <button
              onClick={() => setStep(2)}
              disabled={!formData.send_amount || !rateData}
              className="w-full bg-gradient-to-r from-teal-600 to-blue-600 text-white py-4 rounded-xl font-semibold disabled:opacity-50 hover:shadow-lg transition-all duration-200"
              data-testid="continue-send-btn"
            >
              Continue
            </button>
          </div>
        )}
        
        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Recipient
              </label>
              <select
                value={formData.recipient_id}
                onChange={(e) => setFormData({ ...formData, recipient_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                required
                data-testid="recipient-select"
              >
                <option value="">Choose recipient...</option>
                {recipients.map((recipient) => (
                  <option key={recipient.id} value={recipient.id}>
                    {recipient.full_name} - {recipient.city}, {recipient.state}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payout Method
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  formData.payout_method === 'cash_pickup' ? 'border-teal-500 bg-teal-50' : 'border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="payout_method"
                    value="cash_pickup"
                    checked={formData.payout_method === 'cash_pickup'}
                    onChange={(e) => setFormData({ ...formData, payout_method: e.target.value })}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <div className="text-2xl mb-2">💵</div>
                    <div className="font-medium">Cash Pickup</div>
                    <div className="text-sm text-gray-600">Available in major cities</div>
                  </div>
                </label>
                
                <label className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  formData.payout_method === 'bank_transfer' ? 'border-teal-500 bg-teal-50' : 'border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="payout_method"
                    value="bank_transfer"
                    checked={formData.payout_method === 'bank_transfer'}
                    onChange={(e) => setFormData({ ...formData, payout_method: e.target.value })}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <div className="text-2xl mb-2">🏦</div>
                    <div className="font-medium">Bank Transfer</div>
                    <div className="text-sm text-gray-600">Direct to bank account</div>
                  </div>
                </label>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Reference (Optional)
              </label>
              <input
                type="text"
                value={formData.payment_reference}
                onChange={(e) => setFormData({ ...formData, payment_reference: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="EcoCash reference or deposit slip number"
                data-testid="payment-reference-input"
              />
            </div>
            
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 bg-gray-200 text-gray-800 py-4 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-200"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-teal-600 to-blue-600 text-white py-4 rounded-xl font-semibold disabled:opacity-50 hover:shadow-lg transition-all duration-200"
                data-testid="confirm-transfer-btn"
              >
                {loading ? 'Processing...' : 'Confirm Transfer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// Recipients Tab Component  
const RecipientsTab = ({ recipients, onUpdate }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    address: '',
    city: '',
    state: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/recipients', formData);
      toast.success('Recipient added successfully!');
      setShowAddForm(false);
      setFormData({
        full_name: '',
        phone: '',
        email: '',
        bank_name: '',
        account_number: '',
        ifsc_code: '',
        address: '',
        city: '',
        state: ''
      });
      onUpdate();
    } catch (error) {
      toast.error('Failed to add recipient');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Recipients</h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
            data-testid="add-recipient-btn"
          >
            + Add Recipient
          </button>
        </div>
        
        {recipients.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">👥</div>
            <p className="text-gray-600">No recipients added yet</p>
            <p className="text-sm text-gray-500">Add your first recipient to start sending money</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {recipients.map((recipient) => (
              <div key={recipient.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-800">{recipient.full_name}</h3>
                    <p className="text-sm text-gray-600">{recipient.phone}</p>
                    <p className="text-sm text-gray-600">{recipient.address}</p>
                    <p className="text-sm text-gray-600">{recipient.city}, {recipient.state}</p>
                    {recipient.bank_name && (
                      <p className="text-sm text-teal-600 mt-2">
                        🏦 {recipient.bank_name} - {recipient.account_number}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-800">Add New Recipient</h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  required
                  data-testid="recipient-name-input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  required
                  data-testid="recipient-phone-input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  data-testid="recipient-email-input"
                />
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-800 mb-3">Bank Details (for bank transfers)</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      data-testid="bank-name-input"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={formData.account_number}
                      onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      data-testid="account-number-input"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      value={formData.ifsc_code}
                      onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      data-testid="ifsc-code-input"
                    />
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-800 mb-3">Address</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address *
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      required
                      data-testid="recipient-address-input"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City *
                      </label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        required
                        data-testid="recipient-city-input"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State *
                      </label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        required
                        data-testid="recipient-state-input"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-medium hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-teal-600 text-white py-3 rounded-lg font-medium disabled:opacity-50 hover:bg-teal-700"
                  data-testid="save-recipient-btn"
                >
                  {loading ? 'Saving...' : 'Save Recipient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Transaction History Tab Component
const TransactionHistoryTab = ({ transactions }) => {
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
        <h2 className="text-xl font-bold text-gray-800 mb-6">Transaction History</h2>
        
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📋</div>
            <p className="text-gray-600">No transactions yet</p>
            <p className="text-sm text-gray-500">Your money transfers will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-medium text-gray-800">{transaction.order_number}</div>
                    <div className="text-sm text-gray-600">To: {transaction.recipient_name}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                    {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Send Amount</div>
                    <div className="font-medium">${transaction.send_amount}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Fee</div>
                    <div className="font-medium">${transaction.fee_amount.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Exchange Rate</div>
                    <div className="font-medium">₹{transaction.exchange_rate}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Recipient Gets</div>
                    <div className="font-medium text-teal-600">₹{transaction.receive_amount.toFixed(2)}</div>
                  </div>
                </div>
                
                {transaction.payment_reference && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-sm text-gray-500">Payment Reference</div>
                    <div className="text-sm font-medium">{transaction.payment_reference}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Profile Tab Component
const ProfileTab = ({ user, notifications }) => {
  return (
    <div className="space-y-6">
      {/* Profile Info */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Profile Information</h2>
        
        <div className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">{user.full_name}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">{user.phone}</div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">{user.email}</div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">{user.city}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <div className={`px-3 py-2 rounded-lg font-medium ${
                user.status === 'verified' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {user.status === 'verified' ? '✓ Verified' : 'Pending Verification'}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Notifications */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Notifications</h2>
        
        {notifications.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-3xl mb-3">🔔</div>
            <p className="text-gray-600">No notifications</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.slice(0, 5).map((notification) => (
              <div key={notification.id} className="border-l-4 border-teal-500 bg-teal-50 p-4 rounded">
                <div className="font-medium text-teal-800">{notification.title}</div>
                <div className="text-sm text-teal-700 mt-1">{notification.message}</div>
                <div className="text-xs text-teal-600 mt-2">
                  {new Date(notification.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Admin Dashboard Component will be added in the next file due to length
// This completes the main user-facing application

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<WelcomeScreen />} />
            <Route path="/auth" element={<AuthScreen />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />
          </Routes>
          <Toaster position="top-center" richColors />
        </div>
      </Router>
    </AuthProvider>
  );
}

// Import Admin Dashboard
import AdminDashboard from './components/AdminDashboard';

export default App;