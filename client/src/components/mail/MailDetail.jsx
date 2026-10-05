import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import DOMPurify from 'dompurify';
import {
  ArrowLeft,
  Star,
  Bookmark,
  Trash2,
  FolderInput,
  Reply,
  Forward,
  Download,
  FileText,
  Image,
  Paperclip,
  Send,
  Printer
} from 'lucide-react';

export default function MailDetail({
  emailId,
  onBack,
  onReply,
  onForward,
  onDelete,
  folders = [],
  onMoveToFolder
}) {
  const { user } = useAuth();
  const [email, setEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Quick reply state
  const [quickReplyText, setQuickReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  useEffect(() => {
    const fetchEmailDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/emails/${emailId}`);
        if (res.data.success) {
          setEmail(res.data.data);
        }
      } catch (err) {
        console.error('Fetch email error:', err);
        setError(err.response?.data?.message || 'Failed to load email message.');
      } finally {
        setLoading(false);
      }
    };

    if (emailId) {
      fetchEmailDetail();
    }
  }, [emailId]);

  const handleToggleStar = async () => {
    if (!email) return;
    try {
      const res = await api.put(`/emails/${email.id}/star`);
      if (res.data.success) {
        setEmail((prev) => ({
          ...prev,
          userState: { ...prev.userState, isStarred: res.data.is_starred }
        }));
      }
    } catch (e) {}
  };

  const handleToggleImportant = async () => {
    if (!email) return;
    try {
      const res = await api.put(`/emails/${email.id}/important`);
      if (res.data.success) {
        setEmail((prev) => ({
          ...prev,
          userState: { ...prev.userState, isImportant: res.data.is_important }
        }));
      }
    } catch (e) {}
  };

  const handleDownloadAttachment = async (att) => {
    try {
      const token = localStorage.getItem('intranet_token');
      // Request download via blob
      const response = await api.get(`/attachments/download/${att.id}`, {
        responseType: 'blob'
      });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', att.original_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      alert('Failed to download attachment. Access may be restricted.');
    }
  };

  const handleSendQuickReply = async (e) => {
    e.preventDefault();
    if (!quickReplyText.trim()) return;

    setIsSendingReply(true);
    try {
      const payload = {
        to: email.sender_email,
        subject: email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
        body: `<p>${quickReplyText.replace(/\n/g, '<br/>')}</p>`,
        parent_email_id: email.id
      };

      const res = await api.post('/emails/compose', payload);
      if (res.data.success) {
        setQuickReplyText('');
        // Refresh email detail to see updated thread
        const refreshed = await api.get(`/emails/${emailId}`);
        if (refreshed.data.success) {
          setEmail(refreshed.data.data);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to dispatch reply.');
    } finally {
      setIsSendingReply(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-4 animate-pulse">
        <div className="w-1/3 h-8 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="w-1/2 h-5 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="w-full h-48 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
      </div>
    );
  }

  if (error || !email) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm font-semibold text-rose-600 mb-4">{error || 'Message not available.'}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg"
        >
          Back to list
        </button>
      </div>
    );
  }

  const isStarred = Boolean(email.userState?.isStarred);
  const isImportant = Boolean(email.userState?.isImportant);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 overflow-y-auto">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur z-10">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Back to mailbox"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />
          <button
            onClick={handleToggleStar}
            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Star message"
          >
            <Star className={`w-4 h-4 ${isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
          </button>
          <button
            onClick={handleToggleImportant}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Mark important"
          >
            <Bookmark className={`w-4 h-4 ${isImportant ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
          <button
            onClick={() => onDelete(email.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Delete email"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Print email"
          >
            <Printer className="w-4 h-4" />
          </button>
          <button
            onClick={() => onReply(email)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition"
          >
            <Reply className="w-3.5 h-3.5" />
            Reply
          </button>
          <button
            onClick={() => onForward(email)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <Forward className="w-3.5 h-3.5" />
            Forward
          </button>
        </div>
      </div>

      {/* Main Email Content */}
      <div className="p-6 max-w-4xl space-y-6">
        {/* Subject Header */}
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {email.subject || '(No Subject)'}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
              Internal Message
            </span>
            {email.parent_email_id && (
              <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-medium">
                Thread Conversation
              </span>
            )}
          </div>
        </div>

        {/* Sender & Recipient Details Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-base overflow-hidden shrink-0 shadow-sm">
              {email.sender_avatar ? (
                <img src={email.sender_avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                (email.sender_name || 'U').charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{email.sender_name}</span>
                <span className="text-xs text-slate-500 font-mono">&lt;{email.sender_email}&gt;</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {email.sender_designation} • {email.sender_department}
              </p>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 flex flex-wrap gap-1 items-center">
                <span className="font-semibold text-slate-700 dark:text-slate-300">To:</span>
                {email.recipients?.map((r) => (
                  <span
                    key={r.id}
                    className="inline-block px-1.5 py-0.5 rounded text-[11px] bg-slate-200/80 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                  >
                    {r.name} ({r.type.toUpperCase()})
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-400 whitespace-nowrap">
            {new Date(email.created_at).toLocaleString([], {
              dateStyle: 'medium',
              timeStyle: 'short'
            })}
          </div>
        </div>

        {/* Email Body */}
        <div className="py-4 border-b border-slate-100 dark:border-slate-800/80">
          <div
            className="prose dark:prose-invert max-w-none text-sm leading-relaxed text-slate-800 dark:text-slate-200"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(email.body) }}
          />
        </div>

        {/* Attachments Section */}
        {email.attachments && email.attachments.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <Paperclip className="w-4 h-4 text-indigo-500" />
              <span>Attachments ({email.attachments.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {email.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 bg-white dark:bg-slate-900 transition shadow-sm group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      {att.mime_type.startsWith('image/') ? (
                        <Image className="w-5 h-5" />
                      ) : (
                        <FileText className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={att.original_name}>
                        {att.original_name}
                      </p>
                      <p className="text-[11px] text-slate-400">{(att.file_size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownloadAttachment(att)}
                    className="p-2 rounded-lg text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition"
                    title="Download attachment"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Thread History (if multiple emails in chain) */}
        {email.thread && email.thread.length > 1 && (
          <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Conversation Thread ({email.thread.length} messages)
            </h4>
            <div className="space-y-3">
              {email.thread.map((tMsg) => (
                <div
                  key={tMsg.id}
                  className={`p-4 rounded-xl border transition ${
                    tMsg.id === email.id
                      ? 'border-indigo-300 dark:border-indigo-800 bg-indigo-50/20 dark:bg-indigo-950/10'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{tMsg.sender_name}</span>
                      <span className="text-[11px] text-slate-400">&lt;{tMsg.sender_email}&gt;</span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {new Date(tMsg.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  <div
                    className="prose dark:prose-invert max-w-none text-xs text-slate-700 dark:text-slate-300"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(tMsg.body) }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Inline Reply Box */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
          <form onSubmit={handleSendQuickReply} className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Reply className="w-4 h-4 text-indigo-500" />
              <span>Quick Reply to {email.sender_name}</span>
            </div>
            <textarea
              rows={3}
              placeholder={`Write a quick response to ${email.sender_name}...`}
              value={quickReplyText}
              onChange={(e) => setQuickReplyText(e.target.value)}
              className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
            />
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => onReply(email)}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              >
                Open Full Rich Editor
              </button>
              <button
                type="submit"
                disabled={isSendingReply || !quickReplyText.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                <Send className="w-3.5 h-3.5" />
                {isSendingReply ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
