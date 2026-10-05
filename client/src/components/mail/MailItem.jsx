import React from 'react';
import { Star, Paperclip, CheckSquare, Square } from 'lucide-react';

export default function MailItem({
  email,
  isSelected = false,
  onToggleSelect,
  onClick,
  onToggleStar,
  isSentView = false
}) {
  const isRead = email.is_read !== undefined ? Boolean(email.is_read) : true;
  const isStarred = Boolean(email.is_starred);

  // Strip HTML for plain snippet preview
  const plainSnippet = email.body ? email.body.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim() : '';

  const formattedDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    return isToday
      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div
      onClick={onClick}
      className={`group flex items-center gap-3.5 px-4 py-3 border-b border-slate-100 dark:border-slate-800/60 cursor-pointer transition-all duration-150 select-none ${
        !isRead
          ? 'bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-slate-100 shadow-[inset_3px_0_0_0_#4f46e5]'
          : 'bg-slate-50/40 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
      } ${isSelected ? 'bg-indigo-50/80 dark:bg-indigo-950/40' : ''}`}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect(email.id);
        }}
        className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition shrink-0"
        aria-label="Select message"
      >
        {isSelected ? (
          <CheckSquare className="w-4 h-4 text-indigo-600" />
        ) : (
          <Square className="w-4 h-4" />
        )}
      </button>

      {/* Star */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleStar(email.id);
        }}
        className="p-1 text-slate-300 dark:text-slate-600 hover:text-amber-400 transition shrink-0"
        aria-label="Star message"
      >
        <Star
          className={`w-4 h-4 transition-transform active:scale-125 ${
            isStarred ? 'fill-amber-400 text-amber-400' : ''
          }`}
        />
      </button>

      {/* Avatar */}
      <div className="hidden sm:flex w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0 overflow-hidden border border-slate-200/80 dark:border-slate-700 shadow-sm">
        {email.sender_avatar ? (
          <img src={email.sender_avatar} alt="" className="w-full h-full object-cover" />
        ) : (
          (email.sender_name || 'U').charAt(0).toUpperCase()
        )}
      </div>

      {/* Sender Name / Recipient */}
      <div className="w-28 sm:w-44 truncate text-xs shrink-0 font-medium text-slate-800 dark:text-slate-200">
        {isSentView ? (
          <span className="text-slate-500 dark:text-slate-400">To: {email.recipients_summary || 'Recipient'}</span>
        ) : (
          email.sender_name || email.sender_email
        )}
      </div>

      {/* Subject & Preview */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className={`text-xs truncate ${!isRead ? 'font-bold text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}>
          {email.subject || '(No Subject)'}
        </span>
        <span className="text-xs text-slate-400 dark:text-slate-500 font-normal truncate hidden md:inline">
          — {plainSnippet}
        </span>
      </div>

      {/* Folder Badge if any */}
      {email.folder_name && (
        <span
          className="hidden lg:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold text-white shrink-0 shadow-sm"
          style={{ backgroundColor: email.folder_color || '#4f46e5' }}
        >
          {email.folder_name}
        </span>
      )}

      {/* Attachment indicator */}
      {email.attachment_count > 0 && (
        <span className="p-1 text-slate-400 dark:text-slate-500 shrink-0 flex items-center gap-0.5 text-[10px]" title={`${email.attachment_count} attachment(s)`}>
          <Paperclip className="w-3.5 h-3.5" />
          {email.attachment_count > 1 && <span>{email.attachment_count}</span>}
        </span>
      )}

      {/* Date */}
      <div className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0 whitespace-nowrap text-right w-16">
        {formattedDate(email.created_at)}
      </div>
    </div>
  );
}
