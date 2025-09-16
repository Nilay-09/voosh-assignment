// Type definitions for RAG News Chatbot Frontend

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  sessionId?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
}

export interface NewsSource {
  name: string;
  url: string;
  category: string;
  articleCount: number;
  lastUpdated: Date;
  isActive: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ChatResponse {
  response: string;
  sessionId: string;
  sources?: string[];
}

export interface Theme {
  name: 'light' | 'dark';
  displayName: string;
}

export interface AppState {
  currentSession: ChatSession | null;
  messages: Message[];
  isLoading: boolean;
  isConnected: boolean;
  theme: Theme['name'];
  sidebarOpen: boolean;
}

export interface SocketEvents {
  'chat-message': (data: { message: string; sessionId: string }) => void;
  'chat-response': (data: ChatResponse) => void;
  'session-created': (data: { sessionId: string }) => void;
  'error': (data: { message: string }) => void;
  'connect': () => void;
  'disconnect': () => void;
}
