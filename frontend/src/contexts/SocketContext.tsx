import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UploadProgress {
  uploadId: number;
  phase: 'processing' | 'completed' | 'failed';
  totalRecords?: number;
  processedCount?: number;
  errorCount?: number;
  progress?: number;
  currentRecord?: number;
  status?: string;
  error?: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  uploadProgress: UploadProgress | null;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  uploadProgress: null,
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

  useEffect(() => {
    // Connect to Socket.IO server
    const newSocket = io(
      process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:3002',
      {
        withCredentials: true,
      }
    );

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to Socket.IO server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from Socket.IO server');
      setIsConnected(false);
    });

    // Listen for upload progress updates
    newSocket.on('upload-progress', (progress: UploadProgress) => {
      console.log('Upload progress:', progress);
      setUploadProgress(progress);

      // Clear progress after completion with a delay
      if (progress.phase === 'completed' || progress.phase === 'failed') {
        setTimeout(() => {
          setUploadProgress(null);
        }, 5000); // Clear after 5 seconds
      }
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const value: SocketContextType = {
    socket,
    isConnected,
    uploadProgress,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
