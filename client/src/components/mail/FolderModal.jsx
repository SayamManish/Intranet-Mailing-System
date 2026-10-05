import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import api from '../../services/api';
import { Folder, FolderPlus, Trash2 } from 'lucide-react';

const COLOR_PRESETS = [
  '#4f46e5', // Indigo
  '#3b82f6', // Blue
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#84cc16', // Lime
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#64748b'  // Slate
];

export default function FolderModal({
  isOpen,
  onClose,
  folder = null, // if folder provided, edit mode; else create mode
  onSuccess,
  onDelete
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#4f46e5');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (folder) {
      setName(folder.name || '');
      setColor(folder.color || '#4f46e5');
    } else {
      setName('');
      setColor('#4f46e5');
    }
    setError('');
  }, [folder, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Folder name is required.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      if (folder) {
        // Edit
        await api.put(`/folders/${folder.id}`, { name: name.trim(), color });
      } else {
        // Create
        await api.post('/folders', { name: name.trim(), color });
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save folder.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFolder = async () => {
    if (!folder) return;
    if (!window.confirm(`Are you sure you want to delete the folder "${folder.name}"? Mails inside will remain in your mailbox.`)) {
      return;
    }

    setLoading(true);
    try {
      await api.delete(`/folders/${folder.id}`);
      if (onDelete) onDelete(folder.id);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete folder.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={folder ? 'Edit Custom Folder' : 'Create New Folder'}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-300">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Folder Name
          </label>
          <input
            type="text"
            placeholder="e.g. Security Audits, Project Alpha"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100 font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Folder Color Tag
          </label>
          <div className="flex flex-wrap gap-2">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full transition-transform ${
                  color === c ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'hover:scale-105'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          {folder ? (
            <button
              type="button"
              onClick={handleDeleteFolder}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Folder
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-md shadow-indigo-600/20 transition active:scale-95"
            >
              {loading ? 'Saving...' : folder ? 'Update Folder' : 'Create Folder'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
