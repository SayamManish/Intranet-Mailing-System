import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import {
  Inbox,
  Send,
  Star,
  Mail,
  MessageSquare,
  Users,
  FolderPlus,
  Edit3,
  TrendingUp,
  Shield,
  Activity,
  ArrowRight,
  Clock
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export default function DashboardPage({ onOpenCompose, onOpenCreateFolder }) {
  const { user } = useAuth();
  const { isUserOnline } = useSocket();
  const navigate = useNavigate();

  const [statsData, setStatsData] = useState({
    stats: { totalInbox: 0, unread: 0, sent: 0, starred: 0 },
    recentEmails: [],
    recentChats: []
  });
  const [onlineMembers, setOnlineMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, dirRes] = await Promise.all([
          api.get('/emails/dashboard-stats'),
          api.get('/contacts/directory')
        ]);

        if (statsRes.data.success) {
          setStatsData(statsRes.data.data);
        }
        if (dirRes.data.success) {
          setOnlineMembers(dirRes.data.data.slice(0, 6));
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Mock activity trend based on actual numbers
  const activityData = [
    { day: 'Mon', received: Math.max(1, Math.round(statsData.stats.totalInbox * 0.15)), sent: Math.max(0, Math.round(statsData.stats.sent * 0.1)) },
    { day: 'Tue', received: Math.max(2, Math.round(statsData.stats.totalInbox * 0.25)), sent: Math.max(1, Math.round(statsData.stats.sent * 0.2)) },
    { day: 'Wed', received: Math.max(1, Math.round(statsData.stats.totalInbox * 0.2)), sent: Math.max(1, Math.round(statsData.stats.sent * 0.25)) },
    { day: 'Thu', received: Math.max(3, Math.round(statsData.stats.totalInbox * 0.3)), sent: Math.max(2, Math.round(statsData.stats.sent * 0.3)) },
    { day: 'Fri', received: Math.max(2, statsData.stats.totalInbox), sent: Math.max(1, statsData.stats.sent) },
    { day: 'Sat', received: Math.max(0, Math.round(statsData.stats.totalInbox * 0.05)), sent: 0 },
    { day: 'Sun', received: 0, sent: 0 }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto animate-fade-in">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-700/60 border border-indigo-500/30 text-xs font-semibold text-indigo-200">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>LAN Node: {user?.employee_id} • {user?.department}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {getGreeting()}, {user?.name}
          </h2>
          <p className="text-xs sm:text-sm text-indigo-200 max-w-xl">
            You have <strong className="text-white underline">{statsData.stats.unread} unread</strong> internal communications requiring attention. All channels are operating within the isolated network.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={onOpenCompose}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-indigo-900 text-xs font-bold hover:bg-indigo-50 shadow-md transition active:scale-95"
          >
            <Edit3 className="w-4 h-4 text-indigo-600" />
            <span>Compose Mail</span>
          </button>
        </div>
      </div>

      {/* 4 Core Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Inbox */}
        <div
          onClick={() => navigate('/mail/inbox')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition shadow-sm cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Inbox
            </span>
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
              <Inbox className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-2">
            {statsData.stats.totalInbox}
          </p>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>Received messages</span>
          </p>
        </div>

        {/* Card 2: Unread Messages */}
        <div
          onClick={() => navigate('/mail/inbox')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition shadow-sm cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Unread Messages
            </span>
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
              <Mail className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-2">
            {statsData.stats.unread}
          </p>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>Pending review</span>
          </p>
        </div>

        {/* Card 3: Sent Messages */}
        <div
          onClick={() => navigate('/mail/sent')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition shadow-sm cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Sent Messages
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <Send className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-2">
            {statsData.stats.sent}
          </p>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>Dispatched on LAN</span>
          </p>
        </div>

        {/* Card 4: Starred Messages */}
        <div
          onClick={() => navigate('/mail/starred')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition shadow-sm cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Starred
            </span>
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-500 dark:text-rose-400 group-hover:scale-110 transition-transform">
              <Star className="w-5 h-5 fill-rose-500" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-2">
            {statsData.stats.starred}
          </p>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>Important tags</span>
          </p>
        </div>
      </div>

      {/* Activity Chart & Quick Actions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Activity Recharts Area */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <span>Internal Traffic Flow</span>
              </h3>
              <p className="text-xs text-slate-400">LAN message packet exchange</p>
            </div>
            <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg">
              Live Activity
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRecv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e1b4b',
                    borderColor: '#312e81',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Area type="monotone" dataKey="received" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorRecv)" name="Received" />
                <Area type="monotone" dataKey="sent" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSent)" name="Sent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Tools & Department Colleagues */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onOpenCompose}
                className="p-3 text-left rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200/60 dark:border-slate-800 transition group"
              >
                <Edit3 className="w-4 h-4 text-indigo-600 mb-1.5" />
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600">New Email</p>
                <p className="text-[10px] text-slate-400">Send to peer</p>
              </button>

              <button
                onClick={() => navigate('/chat')}
                className="p-3 text-left rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200/60 dark:border-slate-800 transition group"
              >
                <MessageSquare className="w-4 h-4 text-emerald-600 mb-1.5" />
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600">LAN Chat</p>
                <p className="text-[10px] text-slate-400">Realtime room</p>
              </button>

              <button
                onClick={() => navigate('/contacts')}
                className="p-3 text-left rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200/60 dark:border-slate-800 transition group"
              >
                <Users className="w-4 h-4 text-blue-600 mb-1.5" />
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600">Directory</p>
                <p className="text-[10px] text-slate-400">Find members</p>
              </button>

              <button
                onClick={onOpenCreateFolder}
                className="p-3 text-left rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-slate-200/60 dark:border-slate-800 transition group"
              >
                <FolderPlus className="w-4 h-4 text-purple-600 mb-1.5" />
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-purple-600">New Folder</p>
                <p className="text-[10px] text-slate-400">Organize mail</p>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Emails & Active Conversations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Emails */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-600" />
              <span>Recent Communications</span>
            </h3>
            <button
              onClick={() => navigate('/mail/inbox')}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {statsData.recentEmails.length > 0 ? (
              statsData.recentEmails.map((email) => (
                <div
                  key={email.id}
                  onClick={() => navigate(`/mail/inbox?open=${email.id}`)}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 px-2 rounded-xl cursor-pointer transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                      {email.sender_name?.charAt(0) || 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs truncate ${!email.is_read ? 'font-bold text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}>
                        {email.subject}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">From: {email.sender_name}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {new Date(email.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-xs text-slate-400">No incoming messages yet.</p>
            )}
          </div>
        </div>

        {/* Realtime LAN Chat Activity */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>Active Chat Channels</span>
            </h3>
            <button
              onClick={() => navigate('/chat')}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1"
            >
              Open chat <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {statsData.recentChats.length > 0 ? (
              statsData.recentChats.map((chat) => (
                <div
                  key={chat.conversation_id}
                  onClick={() => navigate('/chat')}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 px-2 rounded-xl cursor-pointer transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {chat.other_user_name?.charAt(0) || 'U'}
                      </div>
                      <span
                        className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                          isUserOnline(chat.other_user_id) ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {chat.other_user_name}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {chat.last_message || 'Started conversation'}
                      </p>
                    </div>
                  </div>
                  {chat.unread_count > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                      {chat.unread_count}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-xs text-slate-400">No active chat sessions.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
