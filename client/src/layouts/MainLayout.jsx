import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar';
import Navbar from '../components/common/Navbar';
import ToastContainer from '../components/common/ToastContainer';
import ComposeModal from '../components/mail/ComposeModal';
import FolderModal from '../components/mail/FolderModal';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';

export default function MainLayout() {
  const location = useLocation();
  const { socket } = useSocket();

  const [folders, setFolders] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Compose Modal state
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeInitialData, setComposeInitialData] = useState(null);

  // Folder Modal state
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);

  // Fetch folders and unread count
  const fetchLayoutData = useCallback(async () => {
    try {
      const [foldersRes, inboxRes] = await Promise.all([
        api.get('/folders'),
        api.get('/emails/inbox?limit=1')
      ]);

      if (foldersRes.data.success) {
        setFolders(foldersRes.data.data || []);
      }
      if (inboxRes.data.success && inboxRes.data.meta) {
        setUnreadCount(inboxRes.data.meta.unread || 0);
      }
    } catch (e) {
      // quiet
    }
  }, []);

  useEffect(() => {
    fetchLayoutData();
  }, [fetchLayoutData, location.pathname]);

  // Listen for new email events to refresh sidebar badge
  useEffect(() => {
    if (!socket) return;
    const handleNewEmail = () => {
      fetchLayoutData();
    };
    socket.on('new_email', handleNewEmail);
    return () => {
      socket.off('new_email', handleNewEmail);
    };
  }, [socket, fetchLayoutData]);

  const handleOpenCompose = (initialData = null) => {
    setComposeInitialData(initialData);
    setIsComposeOpen(true);
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      {/* Navigation Sidebar */}
      <Sidebar
        folders={folders}
        unreadInboxCount={unreadCount}
        onOpenCompose={() => handleOpenCompose(null)}
        onOpenCreateFolder={() => setIsFolderModalOpen(true)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Navbar onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} />

        <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950">
          <Outlet context={{ onOpenCompose: handleOpenCompose, onRefreshFolders: fetchLayoutData, folders }} />
        </main>
      </div>

      {/* Realtime Floating Notifications */}
      <ToastContainer />

      {/* Compose Message Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => {
          setIsComposeOpen(false);
          setComposeInitialData(null);
        }}
        initialData={composeInitialData}
        onSent={() => fetchLayoutData()}
      />

      {/* Create Folder Modal */}
      <FolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onSuccess={() => fetchLayoutData()}
      />
    </div>
  );
}
