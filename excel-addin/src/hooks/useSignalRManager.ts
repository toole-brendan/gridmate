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
      // Check if the existing connection is authenticated by looking for sessionId
      const isAuth = !!(globalSignalRClient as any).sessionId;
      setIsAuthenticated(isAuth);
      addDebugLog?.(`Using existing SignalR connection (authenticated: ${isAuth})`, 'info');
    } else {
      const newClient = new SignalRClient('https://localhost:7171/hub');
      globalSignalRClient = newClient;
      clientRef.current = newClient;

      newClient.on('connected', () => {
        setConnectionStatus('connected');
        // Don't set authenticated here - wait for auth_success event
        addDebugLog?.('SignalR connected successfully', 'success');
      });
      
      newClient.on('auth_success', (data) => {
        setIsAuthenticated(true);
        addDebugLog?.(`SignalR authenticated successfully. Session: ${data.sessionId}`, 'success');
      });
      
      newClient.on('auth_error', (error) => {
        setIsAuthenticated(false);
        addDebugLog?.(`SignalR authentication failed: ${error}`, 'error');
      });
      
      newClient.on('disconnected', () => {
        setConnectionStatus('disconnected');
        setIsAuthenticated(false);
        addDebugLog?.('SignalR disconnected', 'warning');
      });
      
      newClient.on('reconnecting', () => {
        setConnectionStatus('connecting');
        setIsAuthenticated(false);
        addDebugLog?.('SignalR reconnecting...', 'warning');
      });
      
      newClient.on('reconnected', () => {
        setConnectionStatus('connected');
        // Don't set authenticated here - wait for auth_success event after re-authentication
        addDebugLog?.('SignalR reconnected, awaiting authentication...', 'info');
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