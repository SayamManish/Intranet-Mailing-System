import React, { useState, useRef, useEffect } from 'react';
import {
  RotateCw,
  Trash2,
  Mail,
  MailOpen,
  FolderInput,
  CheckSquare,
  Square,
  ChevronDown
} from 'lucide-react';

export default function MailToolbar({
  selectedCount = 0,
  totalCount = 0,
  allSelected = false,
  onToggleSelectAll,
  onRefresh,
  onDeleteSelected,
  onMarkReadSelected,
  onMarkUnreadSelected,
  onMoveToFolder,
  folders = [],
  filter = 'all',
  onFilterChange,
  isRefreshing = false
}) {
  const [showFolderMenu, setShowFolderMenu] = useState(false);
  const folderMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (folderMenuRef.current && !folderMenuRef.current.contains(e.target)) {
        setShowFolderMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      {/* Left: Checkbox & Bulk action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSelectAll}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          title={allSelected ? 'Deselect all' : 'Select all'}
        >
          {allSelected && totalCount > 0 ? (
            <CheckSquare className="w-4 h-4 text-indigo-600" />
          ) : (
            <Square className="w-4 h-4 text-slate-400" />
          )}
        </button>

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className={`p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
            isRefreshing ? 'animate-spin text-indigo-600' : ''
          }`}
          title="Refresh mailbox"
        >
          <RotateCw className="w-4 h-4" />
        </button>

        {selectedCount > 0 && (
          <div className="flex items-center gap-1 pl-2 border-l border-slate-200 dark:border-slate-800 animate-fade-in">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 pr-2">
              {selectedCount} selected
            </span>

            <button
              onClick={onDeleteSelected}
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Delete selected"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={onMarkReadSelected}
              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Mark as read"
            >
              <MailOpen className="w-4 h-4" />
            </button>

            <button
              onClick={onMarkUnreadSelected}
              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Mark as unread"
            >
              <Mail className="w-4 h-4" />
            </button>

            {/* Move to Folder Dropdown */}
            <div className="relative" ref={folderMenuRef}>
              <button
                onClick={() => setShowFolderMenu(!showFolderMenu)}
                className="flex items-center gap-1 p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-xs font-medium"
                title="Move to Folder"
              >
                <FolderInput className="w-4 h-4" />
                <ChevronDown className="w-3 h-3" />
              </button>

              {showFolderMenu && (
                <div className="absolute left-0 mt-1.5 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-1.5 z-40 animate-fade-in">
                  <p className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Move to folder
                  </p>
                  {folders.length > 0 ? (
                    folders.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => {
                          onMoveToFolder(f.id);
                          setShowFolderMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: f.color || '#4f46e5' }}
                        />
                        <span className="truncate">{f.name}</span>
                      </button>
                    ))
                  ) : (
                    <p className="px-2 py-2 text-xs text-slate-400 italic">No custom folders created</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right: Quick filter tabs */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/70 p-0.5 rounded-lg text-xs font-medium">
        <button
          onClick={() => onFilterChange('all')}
          className={`px-2.5 py-1 rounded-md transition ${
            filter === 'all'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
          }`}
        >
          All
        </button>
        <button
          onClick={() => onFilterChange('unread')}
          className={`px-2.5 py-1 rounded-md transition ${
            filter === 'unread'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
          }`}
        >
          Unread
        </button>
        <button
          onClick={() => onFilterChange('starred')}
          className={`px-2.5 py-1 rounded-md transition ${
            filter === 'starred'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
          }`}
        >
          Starred
        </button>
        <button
          onClick={() => onFilterChange('attachments')}
          className={`px-2.5 py-1 rounded-md transition ${
            filter === 'attachments'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
          }`}
        >
          With Files
        </button>
      </div>
    </div>
  );
}
