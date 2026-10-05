import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  UserPlus,
  Mail,
  MessageSquare,
  Building,
  Edit2,
  Trash2,
  Phone,
  Shield,
  CheckCircle,
  X
} from 'lucide-react';
import Modal from '../components/common/Modal';
import EmptyState from '../components/common/EmptyState';

export default function ContactsPage({ onOpenCompose }) {
  const { isUserOnline } = useSocket();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('directory'); // 'directory' | 'saved'
  const [directory, setDirectory] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('');

  // Add / Edit Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUserToAdd, setSelectedUserToAdd] = useState(null);
  const [nickname, setNickname] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  const fetchContactsData = useCallback(async () => {
    setLoading(true);
    try {
      const [dirRes, contRes] = await Promise.all([
        api.get('/contacts/directory', { params: { q: searchQuery, department: selectedDept } }),
        api.get('/contacts')
      ]);

      if (dirRes.data.success) {
        setDirectory(dirRes.data.data);
      }
      if (contRes.data.success) {
        setContacts(contRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedDept]);

  useEffect(() => {
    fetchContactsData();
  }, [fetchContactsData]);

  const handleOpenAddModal = (user) => {
    setSelectedUserToAdd(user);
    setNickname('');
    setNotes('');
    setShowAddModal(true);
  };

  const handleSaveContact = async (e) => {
    e.preventDefault();
    if (!selectedUserToAdd) return;

    setIsSubmitting(true);
    try {
      const res = await api.post('/contacts', {
        contact_user_id: selectedUserToAdd.id,
        nickname,
        notes
      });

      if (res.data.success) {
        setActionSuccess(`Added ${selectedUserToAdd.name} to your contacts.`);
        setShowAddModal(false);
        fetchContactsData();
        setTimeout(() => setActionSuccess(''), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add contact.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteContact = async (contactId) => {
    if (!window.confirm('Remove this user from your saved contacts?')) return;
    try {
      await api.delete(`/contacts/${contactId}`);
      fetchContactsData();
    } catch (e) {
      alert('Failed to remove contact.');
    }
  };

  const handleStartChat = (targetUserId) => {
    navigate('/chat', { state: { targetUserId } });
  };

  // Departments list for filter
  const departments = Array.from(new Set(directory.map((u) => u.department))).filter(Boolean);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-indigo-600" />
            <span>Organization Directory & Contacts</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Registered personnel on the intranet local area network
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'directory'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            All Members ({directory.length})
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'saved'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Saved Contacts ({contacts.length})
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, employee ID, designation, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="w-full sm:w-64">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Directory Grid */}
      {activeTab === 'directory' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {directory.map((user) => {
            const isOnline = isUserOnline(user.id);
            return (
              <div
                key={user.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 transition space-y-4 flex flex-col justify-between group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                      <img
                        src={user.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=4f46e5&color=fff`}
                        alt={user.name}
                        className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                      />
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                          isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                        title={isOnline ? 'Online on LAN' : 'Offline'}
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{user.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.designation}</p>
                      <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">{user.employee_id}</p>
                    </div>
                  </div>

                  {!user.is_in_contacts && (
                    <button
                      onClick={() => handleOpenAddModal(user)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition"
                      title="Add to saved contacts"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2 truncate">
                    <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{user.department}</span>
                  </div>
                  <div className="flex items-center gap-2 truncate font-mono text-[11px]">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => onOpenCompose({ to: user.email })}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 text-xs font-semibold transition"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Send Mail</span>
                  </button>
                  <button
                    onClick={() => handleStartChat(user.id)}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Saved Contacts Grid */}
      {activeTab === 'saved' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.length > 0 ? (
            contacts.map((c) => {
              const isOnline = isUserOnline(c.user_id);
              return (
                <div
                  key={c.contact_id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative">
                        <img
                          src={c.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=4f46e5&color=fff`}
                          alt={c.name}
                          className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                        />
                        <span
                          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                            isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                          {c.nickname || c.name}
                        </h4>
                        {c.nickname && <p className="text-[11px] text-slate-400 truncate">({c.name})</p>}
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{c.designation}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteContact(c.contact_id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      title="Remove contact"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {c.notes && (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 italic">
                      "{c.notes}"
                    </div>
                  )}

                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2 truncate">
                      <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{c.department}</span>
                    </div>
                    <div className="flex items-center gap-2 truncate font-mono text-[11px]">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{c.email}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      onClick={() => onOpenCompose({ to: c.email })}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 text-xs font-semibold transition"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Send Mail</span>
                    </button>
                    <button
                      onClick={() => handleStartChat(c.user_id)}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat</span>
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full">
              <EmptyState
                icon={Users}
                title="No saved contacts"
                description="Save frequent collaborators to your personal contacts list for quick access."
                actionLabel="Browse Directory"
                onAction={() => setActiveTab('directory')}
              />
            </div>
          )}
        </div>
      )}

      {/* Add Contact Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add to Personal Contacts"
        maxWidth="max-w-md"
      >
        {selectedUserToAdd && (
          <form onSubmit={handleSaveContact} className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <img
                src={selectedUserToAdd.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUserToAdd.name)}`}
                alt=""
                className="w-10 h-10 rounded-full"
              />
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{selectedUserToAdd.name}</p>
                <p className="text-[11px] text-slate-400">{selectedUserToAdd.email}</p>
                <p className="text-[10px] text-indigo-600 dark:text-indigo-400">{selectedUserToAdd.department}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Custom Nickname (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Bob Lead, Charlie Dev"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Notes / Responsibilities
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Lead contact for campus switch firewall logs..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition"
              >
                {isSubmitting ? 'Saving...' : 'Save Contact'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
