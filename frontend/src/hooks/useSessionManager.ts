import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';

interface SessionManager {
  currentSessionId: string | null;
  isCreatingSession: boolean;
  createSession: () => Promise<string>;
  setCurrentSession: (sessionId: string) => void;
  clearSession: () => void;
  getOrCreateSession: () => Promise<string>;
}

const SESSION_STORAGE_KEY = 'rag_chat_session_id';

export const useSessionManager = (): SessionManager => {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // Load session from localStorage on mount
  useEffect(() => {
    const savedSessionId = localStorage.getItem(SESSION_STORAGE_KEY);
    if (savedSessionId) {
      console.log('Restored session from localStorage:', savedSessionId);
      setCurrentSessionId(savedSessionId);
    }
  }, []);

  // Save session to localStorage when it changes
  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem(SESSION_STORAGE_KEY, currentSessionId);
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [currentSessionId]);

  const createSession = useCallback(async (): Promise<string> => {
    if (isCreatingSession) {
      throw new Error('Session creation already in progress');
    }

    setIsCreatingSession(true);
    try {
      console.log('Creating new session...');
      const response = await apiService.createChatSession();
      const sessionId = response.sessionId;
      
      console.log('Session created:', sessionId);
      setCurrentSessionId(sessionId);
      setIsCreatingSession(false);
      
      return sessionId;
    } catch (error) {
      console.error('Failed to create session:', error);
      setIsCreatingSession(false);
      throw error;
    }
  }, [isCreatingSession]);

  const setCurrentSession = useCallback((sessionId: string) => {
    console.log('Setting current session:', sessionId);
    setCurrentSessionId(sessionId);
  }, []);

  const clearSession = useCallback(() => {
    console.log('Clearing current session');
    setCurrentSessionId(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }, []);

  const getOrCreateSession = useCallback(async (): Promise<string> => {
    if (currentSessionId) {
      return currentSessionId;
    }
    return await createSession();
  }, [currentSessionId, createSession]);

  return {
    currentSessionId,
    isCreatingSession,
    createSession,
    setCurrentSession,
    clearSession,
    getOrCreateSession
  };
};
