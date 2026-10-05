import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import Modal from '../common/Modal';
import {
  Send,
  Paperclip,
  Save,
  X,
  AlertCircle,
  Users,
  Bold,
  Italic,
  List,
  CheckCircle,
  FileText,
  Trash2
} from 'lucide-react';

export default function ComposeModal({
  isOpen,
  onClose,
  initialData = null,
  onSent
}) {
  const [toInput, setToInput] = useState('');
  const [toRecipients, setToRecipients] = useState([]);
  const [ccRecipients, setCcRecipients] = useState([]);
  const [bccRecipients, setBccRecipients] = useState([]);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [parentEmailId, setParentEmailId] = useState(null);
  const [draftId, setDraftId] = useState(null);

  // Directory users for autocomplete
  const [directoryUsers, setDirectoryUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeRecipientType, setActiveRecipientType] = useState('to');

  const [isSending, setIsSending] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Fetch registered intranet users for autocomplete
  useEffect(() => {
    const fetchDirectory = async () => {
      try {
        const res = await api.get('/contacts/directory');
        if (res.data.success) {
          setDirectoryUsers(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch directory:', err);
      }
    };
    fetchDirectory();
  }, []);

  // Pre-fill initial data
  useEffect(() => {
    if (initialData) {
      if (initialData.to) {
        const toList = Array.isArray(initialData.to) ? initialData.to : [initialData.to];
        setToRecipients(toList);
      }
      if (initialData.cc) {
        const ccList = Array.isArray(initialData.cc) ? initialData.cc : [initialData.cc];
        setCcRecipients(ccList);
        setShowCc(true);
      }
      setSubject(initialData.subject || '');
      setBody(initialData.body || '');
      setParentEmailId(initialData.parent_email_id || null);
      if (initialData.draftId) {
        setDraftId(initialData.draftId);
      }
    } else {
      setToRecipients([]);
      setCcRecipients([]);
      setBccRecipients([]);
      setSubject('');
      setBody('');
      setAttachments([]);
      setParentEmailId(null);
      setDraftId(null);
    }
    setErrorMessage('');
    setSuccessMessage('');
  }, [initialData, isOpen]);

  // Handle autocomplete input filter
  const handleRecipientInputChange = (text, type = 'to') => {
    setToInput(text);
    setActiveRecipientType(type);
    if (!text.trim()) {
      setFilteredUsers([]);
      setShowSuggestions(false);
      return;
    }
    const matches = directoryUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(text.toLowerCase()) ||
        u.email.toLowerCase().includes(text.toLowerCase()) ||
        u.department.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredUsers(matches);
    setShowSuggestions(true);
  };

  const handleSelectUser = (userEmail) => {
    if (activeRecipientType === 'to') {
      if (!toRecipients.includes(userEmail)) {
        setToRecipients([...toRecipients, userEmail]);
      }
    } else if (activeRecipientType === 'cc') {
      if (!ccRecipients.includes(userEmail)) {
        setCcRecipients([...ccRecipients, userEmail]);
      }
    } else if (activeRecipientType === 'bcc') {
      if (!bccRecipients.includes(userEmail)) {
        setBccRecipients([...bccRecipients, userEmail]);
      }
    }
    setToInput('');
    setShowSuggestions(false);
    setErrorMessage('');
  };

  const handleRemoveRecipient = (email, type) => {
    if (type === 'to') {
      setToRecipients(toRecipients.filter((e) => e !== email));
    } else if (type === 'cc') {
      setCcRecipients(ccRecipients.filter((e) => e !== email));
    } else if (type === 'bcc') {
      setBccRecipients(bccRecipients.filter((e) => e !== email));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      const currentSize = attachments.reduce((acc, f) => acc + f.size, 0);
      const newSize = selected.reduce((acc, f) => acc + f.size, 0);
      if (currentSize + newSize > 10 * 1024 * 1024) {
        setErrorMessage('Total attachment size exceeds the 10 MB limit.');
        return;
      }
      setAttachments((prev) => [...prev, ...selected]);
    }
  };

  const handleRemoveAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (toRecipients.length === 0) {
      setErrorMessage('Please select at least one internal organization recipient.');
      return;
    }

    if (!subject.trim()) {
      setErrorMessage('Please enter a message subject.');
      return;
    }

    if (!body.trim()) {
      setErrorMessage('Please enter a message body.');
      return;
    }

    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append('to', toRecipients.join(','));
      if (ccRecipients.length > 0) formData.append('cc', ccRecipients.join(','));
      if (bccRecipients.length > 0) formData.append('bcc', bccRecipients.join(','));
      formData.append('subject', subject.trim());
      
      const htmlBody = body.includes('<p>') ? body : body.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('');
      formData.append('body', htmlBody);
      if (parentEmailId) formData.append('parent_email_id', parentEmailId);
      if (draftId) formData.append('draft_id', draftId);

      attachments.forEach((file) => {
        formData.append('attachments', file);
      });

      const res = await api.post('/emails/compose', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        setSuccessMessage('Message transmitted successfully across LAN!');
        setTimeout(() => {
          if (onSent) onSent();
          onClose();
        }, 600);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to dispatch email.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    setErrorMessage('');
    try {
      const formData = new FormData();
      if (draftId) formData.append('id', draftId);
      if (toRecipients.length > 0) formData.append('to', toRecipients.join(','));
      formData.append('subject', subject);
      formData.append('body', body);
      if (parentEmailId) formData.append('parent_email_id', parentEmailId);

      attachments.forEach((file) => {
        formData.append('attachments', file);
      });

      const res = await api.post('/emails/drafts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        setDraftId(res.data.draftId);
        setSuccessMessage('Draft saved locally.');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to save draft.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Compose Internal Message" maxWidth="max-w-3xl">
      <form onSubmit={handleSend} className="space-y-4">
        {/* LAN Boundary Security Alert */}
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-xs text-indigo-700 dark:text-indigo-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-indigo-600" />
          <span>Internal Organization Network: Only registered intranet accounts can receive mail.</span>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-600 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Recipients (To) */}
        <div className="relative">
          <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition">
            <span className="text-xs font-bold text-slate-500 w-8">To:</span>
            {toRecipients.map((email) => (
              <span
                key={email}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
              >
                {email}
                <button
                  type="button"
                  onClick={() => handleRemoveRecipient(email, 'to')}
                  className="hover:text-rose-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <input
              type="text"
              placeholder={toRecipients.length === 0 ? "Search member name or department..." : ""}
              value={activeRecipientType === 'to' ? toInput : ''}
              onChange={(e) => handleRecipientInputChange(e.target.value, 'to')}
              className="flex-1 min-w-[140px] text-xs bg-transparent focus:outline-none text-slate-900 dark:text-slate-100"
            />
            <div className="flex items-center gap-2 ml-auto">
              {!showCc && (
                <button
                  type="button"
                  onClick={() => setShowCc(true)}
                  className="text-xs text-slate-400 hover:text-indigo-600 font-semibold px-1"
                >
                  Cc
                </button>
              )}
              {!showBcc && (
                <button
                  type="button"
                  onClick={() => setShowBcc(true)}
                  className="text-xs text-slate-400 hover:text-indigo-600 font-semibold px-1"
                >
                  Bcc
                </button>
              )}
            </div>
          </div>

          {/* Autocomplete suggestions dropdown */}
          {showSuggestions && filteredUsers.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.map((u) => (
                <div
                  key={u.id}
                  onClick={() => handleSelectUser(u.email)}
                  className="p-2.5 hover:bg-indigo-50 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between text-xs transition"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{u.name}</p>
                      <p className="text-[11px] text-slate-400">{u.email}</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                    {u.department}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CC Field (if enabled) */}
        {showCc && (
          <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl animate-fade-in">
            <span className="text-xs font-bold text-slate-500 w-8">Cc:</span>
            {ccRecipients.map((email) => (
              <span
                key={email}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
              >
                {email}
                <button
                  type="button"
                  onClick={() => handleRemoveRecipient(email, 'cc')}
                  className="hover:text-rose-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <input
              type="text"
              placeholder="Add Cc recipient..."
              value={activeRecipientType === 'cc' ? toInput : ''}
              onChange={(e) => handleRecipientInputChange(e.target.value, 'cc')}
              className="flex-1 min-w-[140px] text-xs bg-transparent focus:outline-none text-slate-900 dark:text-slate-100"
            />
          </div>
        )}

        {/* BCC Field (if enabled) */}
        {showBcc && (
          <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl animate-fade-in">
            <span className="text-xs font-bold text-slate-500 w-8">Bcc:</span>
            {bccRecipients.map((email) => (
              <span
                key={email}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
              >
                {email}
                <button
                  type="button"
                  onClick={() => handleRemoveRecipient(email, 'bcc')}
                  className="hover:text-rose-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <input
              type="text"
              placeholder="Add Bcc recipient..."
              value={activeRecipientType === 'bcc' ? toInput : ''}
              onChange={(e) => handleRecipientInputChange(e.target.value, 'bcc')}
              className="flex-1 min-w-[140px] text-xs bg-transparent focus:outline-none text-slate-900 dark:text-slate-100"
            />
          </div>
        )}

        {/* Subject */}
        <div>
          <input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100 font-semibold"
          />
        </div>

        {/* Message Body */}
        <div>
          <textarea
            ref={textareaRef}
            rows={8}
            placeholder="Write your internal organization message here..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full p-4 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100 leading-relaxed resize-none font-sans"
          />
        </div>

        {/* Attachments list chips */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {attachments.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                <span className="font-semibold truncate max-w-[160px]">{file.name}</span>
                <span className="text-[10px] text-slate-400">({(file.size / 1024).toFixed(0)} KB)</span>
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(idx)}
                  className="text-slate-400 hover:text-rose-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          className="hidden"
        />

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              <Paperclip className="w-4 h-4 text-slate-400" />
              Attach Files
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSavingDraft}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              <Save className="w-4 h-4 text-slate-400" />
              {isSavingDraft ? 'Saving...' : 'Save Draft'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-md shadow-indigo-600/25 transition active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              {isSending ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
