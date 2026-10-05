import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  MessageSquare,
  Search,
  Send,
  UserPlus,
  Smile,
  Shield,
  Clock,
  Check,
  CheckCheck,
  Mail,
  Users
} from 'lucide-react';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';

export default function ChatPage({ onOpenCompose }) {
  const { user } = useAuth();
  const { socket, isUserOnline } = useSocket();
  const location = useLocation();

  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [activeOtherUser, setActiveOtherUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchConvQuery, setSearchConvQuery] = useState('');

  // Typing state
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // New Chat Modal state
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [directoryUsers, setDirectoryUsers] = useState([]);
  const [searchDirectoryQuery, setSearchDirectoryQuery] = useState('');

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Fetch conversations
  const fetchConversations = async () => {
    try {
      const res = await api.get('/chat/conversations');
      if (res.data.success) {
        setConversations(res.data.data);
        return res.data.data;
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoadingConv(false);
    }
    return [];
  };

  // 2. Fetch messages for active conversation
  const fetchMessages = async (convId) => {
    setLoadingMessages(true);
    try {
      const res = await api.get(`/chat/conversations/${convId}/messages`);
      if (res.data.success) {
        setMessages(res.data.data);
        setActiveOtherUser(res.data.otherUser);
        // Clear unread badge locally in conversation list
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c))
        );
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoadingMessages(false);
      setTimeout(scrollToBottom, 50);
    }
  };

  // Initial load + handle state passed from contacts page
  useEffect(() => {
    const init = async () => {
      const convList = await fetchConversations();
      const targetUserId = location.state?.targetUserId;

      if (targetUserId) {
        try {
          const res = await api.post('/chat/conversations', { targetUserId });
          if (res.data.success) {
            setActiveConvId(res.data.conversationId);
            setActiveOtherUser(res.data.targetUser);
            fetchMessages(res.data.conversationId);
            fetchConversations();
          }
        } catch (e) {
          console.error(e);
        }
      } else if (convList.length > 0 && !activeConvId) {
        setActiveConvId(convList[0].id);
        fetchMessages(convList[0].id);
      }
    };

    init();
  }, [location.state]);

  // Handle active conversation change
  const handleSelectConversation = (conv) => {
    setActiveConvId(conv.id);
    fetchMessages(conv.id);
    if (socket) {
      socket.emit('join_conversation', { conversationId: conv.id });
    }
  };

  // Realtime Socket listeners
  useEffect(() => {
    if (!socket) return;

    if (activeConvId) {
      socket.emit('join_conversation', { conversationId: activeConvId });
    }

    const handleNewMessage = (msg) => {
      if (msg.conversation_id === activeConvId) {
        setMessages((prev) => [...prev, msg]);
        setTimeout(scrollToBottom, 50);
      }
      // Refresh conversations list to update last message
      fetchConversations();
    };

    const handleUserTyping = (data) => {
      if (data.conversationId === activeConvId && data.userId !== user?.id) {
        setIsPeerTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setIsPeerTyping(false);
        }, 3000);
      }
    };

    const handleUserStopTyping = (data) => {
      if (data.conversationId === activeConvId) {
        setIsPeerTyping(false);
      }
    };

    socket.on('new_chat_message', handleNewMessage);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stop_typing', handleUserStopTyping);

    return () => {
      socket.off('new_chat_message', handleNewMessage);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stop_typing', handleUserStopTyping);
      if (activeConvId) {
        socket.emit('leave_conversation', { conversationId: activeConvId });
      }
    };
  }, [socket, activeConvId, user?.id]);

  // Handle message sending
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessageText.trim() || !activeConvId) return;

    const text = newMessageText.trim();
    setNewMessageText('');

    if (socket && socket.connected) {
      socket.emit('send_chat_message', {
        conversationId: activeConvId,
        message: text
      });
      socket.emit('typing_stop', { conversationId: activeConvId });
    } else {
      // Fallback REST call
      api.post(`/chat/conversations/${activeConvId}/messages`, { message: text })
        .then((res) => {
          if (res.data.success) {
            setMessages((prev) => [...prev, res.data.data]);
            setTimeout(scrollToBottom, 50);
          }
        });
    }
  };

  const handleTypingInput = (e) => {
    setNewMessageText(e.target.value);
    if (socket && activeConvId) {
      socket.emit('typing_start', { conversationId: activeConvId });
    }
  };

  // Open start new chat modal
  const handleOpenNewChat = async () => {
    try {
      const res = await api.get('/contacts/directory');
      if (res.data.success) {
        setDirectoryUsers(res.data.data);
      }
      setShowNewChatModal(true);
    } catch (e) {}
  };

  const handleStartNewConversationWithUser = async (targetId) => {
    try {
      const res = await api.post('/chat/conversations', { targetUserId: targetId });
      if (res.data.success) {
        setShowNewChatModal(false);
        setActiveConvId(res.data.conversationId);
        setActiveOtherUser(res.data.targetUser);
        fetchMessages(res.data.conversationId);
        fetchConversations();
      }
    } catch (e) {
      alert('Failed to initialize conversation.');
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) =>
    c.other_user_name?.toLowerCase().includes(searchConvQuery.toLowerCase()) ||
    c.other_user_dept?.toLowerCase().includes(searchConvQuery.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white dark:bg-slate-900 overflow-hidden">
      {/* Left Sidebar: Conversations List */}
      <div className="w-80 sm:w-96 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              <span>Internal Peer Chat</span>
            </h2>
            <p className="text-[11px] text-slate-400">LAN Realtime Channel</p>
          </div>
          <button
            onClick={handleOpenNewChat}
            className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
            title="Start new conversation"
          >
            <UserPlus className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchConvQuery}
              onChange={(e) => setSearchConvQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => {
              const isActive = conv.id === activeConvId;
              const isOnline = isUserOnline(conv.other_user_id);
              return (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  className={`p-3.5 flex items-start gap-3 cursor-pointer transition select-none ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 border-l-4 border-indigo-600'
                      : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={conv.other_user_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.other_user_name)}`}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                        isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {conv.other_user_name}
                      </p>
                      {conv.last_message_time && (
                        <span className="text-[10px] text-slate-400">
                          {new Date(conv.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {conv.last_message || 'Started conversation'}
                    </p>
                  </div>

                  {conv.unread_count > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white shrink-0">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              No conversations found. Click '+' above to start chatting with any intranet peer.
            </div>
          )}
        </div>
      </div>

      {/* Right Area: Active Chat Window */}
      {activeConvId && activeOtherUser ? (
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-900">
          {/* Active Conversation Top Header */}
          <div className="h-16 px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={activeOtherUser.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeOtherUser.name)}`}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                />
                <span
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                    isUserOnline(activeOtherUser.id) ? 'bg-emerald-500' : 'bg-slate-400'
                  }`}
                />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>{activeOtherUser.name}</span>
                  <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                    {activeOtherUser.department}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  {isUserOnline(activeOtherUser.id) ? (
                    <span className="text-emerald-500 font-medium">Active on LAN</span>
                  ) : (
                    `Last active: ${new Date(activeOtherUser.last_seen || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={() => onOpenCompose({ to: activeOtherUser.email })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-300 hover:text-indigo-600 text-xs font-semibold transition"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Send Mail</span>
            </button>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/40 dark:bg-slate-950/40">
            {messages.map((msg) => {
              const isMine = msg.sender_id === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2.5 ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  {!isMine && (
                    <img
                      src={msg.sender_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender_name || 'U')}`}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover shrink-0 mb-1"
                    />
                  )}
                  <div
                    className={`max-w-md rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm ${
                      isMine
                        ? 'bg-indigo-600 text-white rounded-br-none'
                        : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 rounded-bl-none'
                    }`}
                  >
                    {!isMine && (
                      <p className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 mb-0.5">
                        {msg.sender_name}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap">{msg.message}</p>
                    <div
                      className={`text-[9px] mt-1 flex items-center justify-end gap-1 ${
                        isMine ? 'text-indigo-200' : 'text-slate-400'
                      }`}
                    >
                      <span>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isMine && <Check className="w-3 h-3 text-indigo-200" />}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isPeerTyping && (
              <div className="flex items-center gap-2 text-xs text-slate-400 italic animate-pulse">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                <span>{activeOtherUser.name} is typing...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder={`Message ${activeOtherUser.name}...`}
                  value={newMessageText}
                  onChange={handleTypingInput}
                  className="w-full pl-4 pr-10 py-3 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                />
              </div>
              <button
                type="submit"
                disabled={!newMessageText.trim()}
                className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-2xl shadow-md transition active:scale-95 shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-slate-50/50 dark:bg-slate-950/50">
          <EmptyState
            icon={MessageSquare}
            title="No active chat selected"
            description="Select a conversation from the sidebar or click start chat with an organization colleague."
            actionLabel="Start New Conversation"
            onAction={handleOpenNewChat}
          />
        </div>
      )}

      {/* Start New Chat Modal */}
      <Modal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        title="Start Intranet Conversation"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search directory by name, email, department..."
              value={searchDirectoryQuery}
              onChange={(e) => setSearchDirectoryQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {directoryUsers
              .filter(
                (u) =>
                  u.id !== user?.id &&
                  (u.name.toLowerCase().includes(searchDirectoryQuery.toLowerCase()) ||
                    u.department.toLowerCase().includes(searchDirectoryQuery.toLowerCase()) ||
                    u.email.toLowerCase().includes(searchDirectoryQuery.toLowerCase()))
              )
              .map((u) => {
                const isOnline = isUserOnline(u.id);
                return (
                  <div
                    key={u.id}
                    onClick={() => handleStartNewConversationWithUser(u.id)}
                    className="p-3 hover:bg-indigo-50 dark:hover:bg-slate-800/50 cursor-pointer transition flex items-center justify-between rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={u.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}`}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover"
                        />
                        <span
                          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                            isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{u.name}</p>
                        <p className="text-[11px] text-slate-400">{u.department} • {u.designation}</p>
                      </div>
                    </div>
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">Chat</span>
                  </div>
                );
              })}
          </div>
        </div>
      </Modal>
    </div>
  );
}
