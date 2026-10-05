import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);

  const addToast = (toast) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    const newToast = { id, ...toast };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const getSocketURL = () => {
      if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        return `http://${window.location.hostname}:5000`;
      }
      return 'http://localhost:5000';
    };

    const newSocket = io(getSocketURL(), {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('⚡ Socket.IO connected to Intranet gateway');
    });

    newSocket.on('users_online_status', (userIds) => {
      setOnlineUserIds(userIds || []);
    });

    newSocket.on('notification', (notif) => {
      setNotificationCount((prev) => prev + 1);
      addToast({
        type: notif.type,
        title: notif.title,
        message: notif.message,
        relatedId: notif.related_id
      });
    });

    newSocket.on('new_email', (emailData) => {
      addToast({
        type: 'email',
        title: emailData.title,
        message: emailData.message,
        relatedId: emailData.emailId
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, user?.id]);

  const isUserOnline = (userId) => {
    return onlineUserIds.includes(Number(userId));
  };

  return (
    <SocketContext.Provider value={{ socket, onlineUserIds, isUserOnline, toasts, addToast, removeToast, notificationCount, setNotificationCount }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
