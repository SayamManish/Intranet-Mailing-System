import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import {
  Radio,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  Server,
  Zap,
  CheckCircle,
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import Modal from '../components/common/Modal';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!loginIdentifier || !password) {
      setError('Please provide your organization email or Employee ID.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await login(loginIdentifier, password);
      if (res.success) {
        navigate('/dashboard');
      } else {
        setError(res.message || 'Invalid credentials');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to connect to intranet server.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (email, pass) => {
    setLoginIdentifier(email);
    setPassword(pass);
    setError('');
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-900 selection:bg-indigo-500 selection:text-white">
      {/* Left Column: Organization Branding & Network Visuals */}
      <div className="lg:w-1/2 p-8 lg:p-16 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white border-b lg:border-b-0 lg:border-r border-slate-800">
        {/* Abstract Background Glows */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">INTRANET COMMUNICATION</h1>
            <p className="text-xs text-indigo-300 font-mono">LAN Peer-to-Peer Enterprise Portal</p>
          </div>
        </div>

        {/* Hero Section */}
        <div className="my-12 lg:my-auto relative z-10 space-y-6 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-900/60 border border-indigo-700/60 text-xs font-semibold text-indigo-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Air-Gapped & LAN Isolated Boundary</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
            Your Organization's <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-blue-300 to-indigo-200">Private Network</span>
          </h2>

          <p className="text-sm text-slate-300 leading-relaxed">
            High-speed internal mailing, secure attachments, and realtime collaboration exclusively for authorized campus and organizational personnel over the local intranet.
          </p>

          {/* Feature Badges */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-800/40 border border-slate-800">
              <Server className="w-4 h-4 text-indigo-400 shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-slate-200">Zero Cloud Dependency</p>
                <p className="text-[11px] text-slate-400">Pure Local Server</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-800/40 border border-slate-800">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-slate-200">Realtime Sockets</p>
                <p className="text-[11px] text-slate-400">Instant LAN Chat</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-xs text-slate-400 flex items-center justify-between pt-6 border-t border-slate-800/60">
          <span>Ethical Hacking Lab Security Project</span>
          <span className="font-mono text-[11px]">Binding: 0.0.0.0</span>
        </div>
      </div>

      {/* Right Column: Modern Login Card */}
      <div className="lg:w-1/2 p-6 sm:p-12 lg:p-16 flex items-center justify-center bg-slate-950">
        <div className="w-full max-w-md space-y-6">
          {/* Card Header */}
          <div>
            <h3 className="text-2xl font-bold text-white tracking-tight">Sign in to Intranet</h3>
            <p className="text-xs text-slate-400 mt-1">
              Enter your organization email or Employee ID to continue
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300 flex items-start gap-2.5 animate-fade-in">
              <span className="font-bold">Error:</span>
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Organization Email or Employee ID
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. alice@organization.local or EMP-002"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your intranet password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-950"
                />
                <span className="text-xs text-slate-400">Remember credentials on this workstation</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold tracking-wide shadow-lg shadow-indigo-600/25 transition active:scale-[0.99]"
            >
              {loading ? 'Authenticating...' : 'Sign In to Intranet'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Test Logins */}
          <div className="pt-4 border-t border-slate-800/80">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
              Quick Demo Accounts (Password: Password123!)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('alice@organization.local', 'Password123!')}
                className="p-2 text-left bg-slate-900 hover:bg-slate-800/80 border border-slate-800 rounded-xl transition group"
              >
                <p className="text-xs font-semibold text-slate-200 group-hover:text-indigo-400">Alice Walker</p>
                <p className="text-[10px] text-slate-400 truncate">Cyber Security Lab</p>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('bob@organization.local', 'Password123!')}
                className="p-2 text-left bg-slate-900 hover:bg-slate-800/80 border border-slate-800 rounded-xl transition group"
              >
                <p className="text-xs font-semibold text-slate-200 group-hover:text-indigo-400">Bob Smith</p>
                <p className="text-[10px] text-slate-400 truncate">Network Operations</p>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('charlie@organization.local', 'Password123!')}
                className="p-2 text-left bg-slate-900 hover:bg-slate-800/80 border border-slate-800 rounded-xl transition group"
              >
                <p className="text-xs font-semibold text-slate-200 group-hover:text-indigo-400">Charlie Davis</p>
                <p className="text-[10px] text-slate-400 truncate">Software Engineer</p>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@organization.local', 'Password123!')}
                className="p-2 text-left bg-slate-900 hover:bg-purple-950/40 border border-slate-800 hover:border-purple-800 rounded-xl transition group"
              >
                <p className="text-xs font-semibold text-purple-300 group-hover:text-purple-200">System Admin</p>
                <p className="text-[10px] text-slate-400 truncate">IT Superuser</p>
              </button>
            </div>
          </div>

          {/* Registration link */}
          <div className="text-center pt-2">
            <p className="text-xs text-slate-400">
              New organization member?{' '}
              <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold underline">
                Register account
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        title="Intranet Password Recovery"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-200">
            <p className="font-semibold mb-1">Local Airgapped Network Security Policy:</p>
            <p>
              Because this intranet portal operates independently of public internet mail servers, automated password reset emails cannot be dispatched outside the network boundary.
            </p>
          </div>
          <p>
            To reset your credentials, please contact the local IT Administrator in person or reach out to:
          </p>
          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-mono text-slate-800 dark:text-slate-200 space-y-1">
            <p><strong>Administrator:</strong> admin@organization.local</p>
            <p><strong>Department:</strong> IT Infrastructure & Security Lab</p>
          </div>
          <button
            onClick={() => setShowForgotModal(false)}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition"
          >
            Understood
          </button>
        </div>
      </Modal>
    </div>
  );
}
