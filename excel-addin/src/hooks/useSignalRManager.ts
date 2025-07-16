import { useState, useEffect, useRef, useCallback } from 'react';
import { SignalRClient } from '../services/signalr/SignalRClient';
import { SignalRMessageHandler } from '../types/signalr';

// Use a global instance to prevent re-connections on hot-reloads
let globalSignalRClient: SignalRClient | null = null;

export const useSignalRManager = (onMessage: SignalRMessageHandler, addDebugLog?: (message: string, type?: 'info' | 'error' | 'warning' | 'success') => void) => {
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const clientRef = useRef<SignalRClient | null>(null);
  const messageHandlerRef = useRef<SignalRMessageHandler>(onMessage);

  // Update ref when handler changes
  useEffect(() => {
    messageHandlerRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (globalSignalRClient && globalSignalRClient.isConnected()) {
      clientRef.current = globalSignalRClient;
      setConnectionStatus('connected');
      setIsAuthenticated(true);
      addDebugLog?.('Using existing SignalR connection', 'info');
    } else {
      const newClient = new SignalRClient('https://localhost:7171/hub');
      globalSignalRClient = newClient;
      clientRef.current = newClient;

      newClient.on('connected', () => {
        setConnectionStatus('connected');
        setIsAuthenticated(true);
        addDebugLog?.('SignalR connected successfully', 'success');
      });
      
      newClient.on('disconnected', () => {
        setConnectionStatus('disconnected');
        setIsAuthenticated(false);
        addDebugLog?.('SignalR disconnected', 'warning');
      });
      
      newClient.on('error', (error) => {
        const errorMessage = (typeof error === 'object' && error !== null && error.message) 
          ? `${error.message} - ${error.details}` 
          : error.toString();
        console.error('SignalR error:', error);
        setConnectionStatus('disconnected');
        setIsAuthenticated(false);
        addDebugLog?.(`SignalR error: ${errorMessage}`, 'error');
      });
      
      addDebugLog?.('Initiating SignalR connection...', 'info');
      newClient.connect('dev-token-123').catch(err => {
        console.error("SignalR connection failed", err);
        setConnectionStatus('disconnected');
        addDebugLog?.(`SignalR connection failed: ${err}`, 'error');
      });
    }
    
    // Create a stable handler that uses the ref
    const stableHandler = (message: any) => {
      messageHandlerRef.current(message);
    };
    
    // Register the message handler
    clientRef.current?.on('message', stableHandler);

    return () => {
      // Important: Only remove this specific handler, not disconnect
      clientRef.current?.off('message', stableHandler);
    };
  }, [addDebugLog]); // Add addDebugLog to deps

  return { 
    signalRClient: clientRef.current, 
    connectionStatus,
    isAuthenticated
  };
}; 