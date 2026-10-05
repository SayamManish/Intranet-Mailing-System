import React from 'react';
import { Routes, Route, Navigate, useOutletContext } from 'react-router-dom';
import ProtectedRoute from './components/common/ProtectedRoute';
import MainLayout from './layouts/MainLayout';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import MailboxPage from './pages/MailboxPage';
import ContactsPage from './pages/ContactsPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import NotFoundPage from './pages/NotFoundPage';
import { useAuth } from './context/AuthContext';

// Helper wrappers to pass layout context (compose, folders) down to pages
function DashboardWrapper() {
  const { onOpenCompose, onOpenCreateFolder } = useOutletContext();
  return <DashboardPage onOpenCompose={onOpenCompose} onOpenCreateFolder={onOpenCreateFolder} />;
}

function MailboxWrapper() {
  const { onOpenCompose, onRefreshFolders, folders } = useOutletContext();
  return <MailboxPage onOpenCompose={onOpenCompose} onRefreshFolders={onRefreshFolders} folders={folders} />;
}

function ContactsWrapper() {
  const { onOpenCompose } = useOutletContext();
  return <ContactsPage onOpenCompose={onOpenCompose} />;
}

function ChatWrapper() {
  const { onOpenCompose } = useOutletContext();
  return <ChatPage onOpenCompose={onOpenCompose} />;
}

function AdminRouteWrapper() {
  const { user } = useAuth();
  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return <AdminPage />;
}

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected Intranet Application Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardWrapper />} />
          <Route path="/mail/:type" element={<MailboxWrapper />} />
          <Route path="/mail/folder/:folderId" element={<MailboxWrapper />} />
          <Route path="/contacts" element={<ContactsWrapper />} />
          <Route path="/chat" element={<ChatWrapper />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/admin" element={<AdminRouteWrapper />} />
        </Route>
      </Route>

      {/* 404 Fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
