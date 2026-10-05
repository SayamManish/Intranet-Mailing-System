import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import MailToolbar from '../components/mail/MailToolbar';
import MailItem from '../components/mail/MailItem';
import MailDetail from '../components/mail/MailDetail';
import EmptyState from '../components/common/EmptyState';
import SkeletonLoader from '../components/common/SkeletonLoader';
import {
  Inbox,
  Send,
  FileText,
  Star,
  Bookmark,
  Archive,
  Trash2,
  Folder,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function MailboxPage({
  folders = [],
  onOpenCompose,
  onRefreshFolders
}) {
  const { type, folderId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const openEmailId = searchParams.get('open');

  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filter, setFilter] = useState('all');
  const [folderMeta, setFolderMeta] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Determine current endpoint
  const getEndpoint = useCallback(() => {
    if (folderId) return `/folders/${folderId}/emails`;
    switch (type) {
      case 'sent':
        return '/emails/sent';
      case 'drafts':
        return '/emails/drafts';
      case 'starred':
        return '/emails/starred';
      case 'important':
        return '/emails/important';
      case 'archived':
        return '/emails/archived';
      case 'trash':
        return '/emails/trash';
      case 'inbox':
      default:
        return '/emails/inbox';
    }
  }, [type, folderId]);

  const fetchEmails = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setIsRefreshing(true);

    try {
      const endpoint = getEndpoint();
      const res = await api.get(endpoint, {
        params: { page, limit: 30 }
      });

      if (res.data.success) {
        setEmails(res.data.data || []);
        if (res.data.folder) {
          setFolderMeta(res.data.folder);
        }
        if (res.data.meta) {
          setTotalPages(res.data.meta.totalPages || 1);
          setTotalCount(res.data.meta.total || res.data.data?.length || 0);
        } else {
          setTotalCount(res.data.data?.length || 0);
        }
      }
    } catch (err) {
      console.error('Failed to fetch emails:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      setSelectedIds([]);
    }
  }, [getEndpoint, page]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  // Handle select all toggle
  const handleToggleSelectAll = () => {
    if (selectedIds.length === emails.length && emails.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(emails.map((e) => e.id));
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleToggleStar = async (emailId) => {
    try {
      const res = await api.put(`/emails/${emailId}/star`);
      if (res.data.success) {
        setEmails((prev) =>
          prev.map((e) =>
            e.id === emailId ? { ...e, is_starred: res.data.is_starred } : e
          )
        );
      }
    } catch (e) {}
  };

  // Batch operations
  const handleBatchAction = async (action, additionalData = {}) => {
    if (selectedIds.length === 0) return;
    try {
      const res = await api.post('/emails/batch', {
        emailIds: selectedIds,
        action,
        ...additionalData
      });
      if (res.data.success) {
        fetchEmails(true);
        if (onRefreshFolders) onRefreshFolders();
      }
    } catch (e) {
      alert('Failed to process batch action.');
    }
  };

  // Delete single email from detail view
  const handleDeleteSingle = async (emailId) => {
    try {
      await api.delete(`/emails/${emailId}`);
      searchParams.delete('open');
      setSearchParams(searchParams);
      fetchEmails(true);
      if (onRefreshFolders) onRefreshFolders();
    } catch (e) {
      alert('Failed to delete email.');
    }
  };

  // Reply / Forward triggers
  const handleReply = (email) => {
    onOpenCompose({
      to: email.sender_email,
      subject: email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
      body: `<br/><br/><blockquote>On ${new Date(email.created_at).toLocaleString()}, ${email.sender_name} wrote:<br/>${email.body}</blockquote>`,
      parent_email_id: email.id
    });
  };

  const handleForward = (email) => {
    onOpenCompose({
      subject: email.subject.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject}`,
      body: `<br/><br/><blockquote>---------- Forwarded message ---------<br/>From: ${email.sender_name} &lt;${email.sender_email}&gt;<br/>Date: ${new Date(email.created_at).toLocaleString()}<br/>Subject: ${email.subject}<br/><br/>${email.body}</blockquote>`
    });
  };

  // Apply in-memory quick filter
  const filteredEmails = emails.filter((e) => {
    if (filter === 'unread') return !e.is_read;
    if (filter === 'starred') return Boolean(e.is_starred);
    if (filter === 'attachments') return (e.attachment_count || 0) > 0;
    return true;
  });

  // Empty state title & description
  const getEmptyDetails = () => {
    if (folderId) {
      return {
        icon: Folder,
        title: folderMeta ? `Folder '${folderMeta.name}' is empty` : 'This folder is empty',
        description: 'You can organize messages here by moving them into this folder.'
      };
    }
    switch (type) {
      case 'sent':
        return { icon: Send, title: 'No sent messages', description: 'Emails you send over the local network will appear here.' };
      case 'drafts':
        return { icon: FileText, title: 'No saved drafts', description: 'Drafts you save while composing will appear here.' };
      case 'starred':
        return { icon: Star, title: 'No starred messages', description: 'Star important emails to quickly find them later.' };
      case 'important':
        return { icon: Bookmark, title: 'No important messages', description: 'Mark messages as important to keep track of key items.' };
      case 'archived':
        return { icon: Archive, title: 'Archive is empty', description: 'Archived messages will be stored here.' };
      case 'trash':
        return { icon: Trash2, title: 'Trash is empty', description: 'Deleted messages remain in the trash before permanent removal.' };
      case 'inbox':
      default:
        return { icon: Inbox, title: 'Your inbox is clear', description: 'You have no internal messages in your inbox at this time.' };
    }
  };

  // If reading an email detail
  if (openEmailId) {
    return (
      <MailDetail
        emailId={openEmailId}
        onBack={() => {
          searchParams.delete('open');
          setSearchParams(searchParams);
          fetchEmails(true);
        }}
        onReply={handleReply}
        onForward={handleForward}
        onDelete={handleDeleteSingle}
        folders={folders}
        onMoveToFolder={(fId) => handleBatchAction('move_folder', { folder_id: fId })}
      />
    );
  }

  const emptyInfo = getEmptyDetails();

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      {/* Mailbox Header Toolbar */}
      <MailToolbar
        selectedCount={selectedIds.length}
        totalCount={emails.length}
        allSelected={selectedIds.length === emails.length && emails.length > 0}
        onToggleSelectAll={handleToggleSelectAll}
        onRefresh={() => fetchEmails(true)}
        onDeleteSelected={() => handleBatchAction('delete')}
        onMarkReadSelected={() => handleBatchAction('mark_read')}
        onMarkUnreadSelected={() => handleBatchAction('mark_unread')}
        onMoveToFolder={(fId) => handleBatchAction('move_folder', { folder_id: fId })}
        folders={folders}
        filter={filter}
        onFilterChange={setFilter}
        isRefreshing={isRefreshing}
      />

      {/* Main Mail List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <SkeletonLoader count={8} />
        ) : filteredEmails.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredEmails.map((email) => (
              <MailItem
                key={email.id}
                email={email}
                isSelected={selectedIds.includes(email.id)}
                onToggleSelect={handleToggleSelect}
                onClick={() => {
                  if (type === 'drafts') {
                    onOpenCompose({
                      draftId: email.id,
                      to: email.draft_recipients,
                      subject: email.subject,
                      body: email.body
                    });
                  } else {
                    setSearchParams({ open: email.id.toString() });
                  }
                }}
                onToggleStar={handleToggleStar}
                isSentView={type === 'sent'}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={emptyInfo.icon}
            title={emptyInfo.title}
            description={emptyInfo.description}
            actionLabel={type === 'inbox' || type === 'sent' ? 'Compose Message' : undefined}
            onAction={onOpenCompose}
          />
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 text-xs text-slate-500">
          <span>
            Showing {(page - 1) * 30 + 1} - {Math.min(page * 30, totalCount)} of {totalCount}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
