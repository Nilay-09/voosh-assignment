import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import type { ApiResponse, ChatResponse, ChatSession, NewsSource } from '../types';
import config from '../config/env';

class ApiService {
  private api: AxiosInstance;

  constructor(baseURL: string = config.apiBaseUrl) {
    this.api = axios.create({
      baseURL,
      timeout: config.apiTimeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.api.interceptors.request.use(
      (requestConfig: any) => {
        console.log(`API Request: ${requestConfig.method?.toUpperCase()} ${requestConfig.url}`);
        return requestConfig;
      },
      (error: any) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error: any) => {
        console.error('API Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    try {
      const response = await this.api.get('/health');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Chat endpoints
  async sendChatMessage(message: string, sessionId?: string): Promise<ChatResponse> {
    try {
      const response = await this.api.post('/chat/message', {
        message,
        sessionId
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createChatSession(): Promise<{ sessionId: string }> {
    try {
      const response = await this.api.post('/chat/session');
      // Backend returns { success: true, session: { id: "...", ... } }
      return { sessionId: response.data.session.id };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getChatSessions(): Promise<ChatSession[]> {
    try {
      const response = await this.api.get('/chat/sessions');
      return response.data.sessions || [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getChatHistory(sessionId: string): Promise<any[]> {
    try {
      const response = await this.api.get(`/chat/history/${sessionId}`);
      return response.data.messages || [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteChatSession(sessionId: string): Promise<ApiResponse> {
    try {
      const response = await this.api.delete(`/chat/session/${sessionId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Admin endpoints
  async getNewsSources(): Promise<NewsSource[]> {
    try {
      const response = await this.api.get('/admin/sources');
      return response.data.sources || [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async ingestNews(): Promise<ApiResponse> {
    try {
      const response = await this.api.post('/admin/ingest');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getSystemStats(): Promise<any> {
    try {
      const response = await this.api.get('/admin/stats');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async clearVectorDatabase(): Promise<ApiResponse> {
    try {
      const response = await this.api.delete('/admin/articles');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Test endpoints
  async testRAG(query: string): Promise<any> {
    try {
      const response = await this.api.post('/test/rag', { query });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async testEmbeddings(text: string): Promise<any> {
    try {
      const response = await this.api.post('/test/embeddings', { text });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Error handler
  private handleError(error: any): Error {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || error.response.data?.error || 'Server error';
      return new Error(`API Error (${error.response.status}): ${message}`);
    } else if (error.request) {
      // Request was made but no response received
      return new Error('Network error: No response from server');
    } else {
      // Something else happened
      return new Error(`Request error: ${error.message}`);
    }
  }
}

// Create and export singleton instance
export const apiService = new ApiService();
export default apiService;
