import React from 'react';
import { useSocket } from '../../context/SocketContext';
import { Mail, MessageSquare, Info, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ToastContainer() {
  const { toasts, removeToast } = useSocket();
  const navigate = useNavigate();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl animate-slide-in-right transition-all duration-200"
        >
          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
            {toast.type === 'email' ? (
              <Mail className="w-5 h-5" />
            ) : toast.type === 'chat' ? (
              <MessageSquare className="w-5 h-5" />
            ) : (
              <Info className="w-5 h-5" />
            )}
          </div>
          <div
            className="flex-1 cursor-pointer"
            onClick={() => {
              if (toast.type === 'email' && toast.relatedId) {
                navigate(`/mail/inbox?open=${toast.relatedId}`);
              } else if (toast.type === 'chat') {
                navigate('/chat');
              }
              removeToast(toast.id);
            }}
          >
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{toast.title}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5">{toast.message}</p>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
