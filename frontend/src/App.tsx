import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Sun, Moon } from 'lucide-react';
import { useSocket } from './hooks/useSocket';
import { useSessionManager } from './hooks/useSessionManager';
import './App.css';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { socket } = useSocket();
  const { getOrCreateSession } = useSessionManager();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;


    const handleMessage = (data: any) => {
      console.log('Received message:', data);
      const messageText = data.content || data.message || data.text || '';
      
      // Always clear loading state when any message event is received
      setIsLoading(false);
      
      // Add message if it has content (remove sender check to catch all messages)
      if (messageText.trim()) {
        const newMessage: Message = {
          id: `msg-${Date.now()}-${Math.random()}`,
          text: messageText,
          sender: data.role || data.sender || 'assistant',
          timestamp: new Date()
        };
        console.log('Adding message to chat:', newMessage);
        setMessages(prev => {
          // Check for duplicate messages
          const isDuplicate = prev.some(msg => 
            msg.text === messageText && 
            msg.sender === newMessage.sender && 
            Math.abs(msg.timestamp.getTime() - newMessage.timestamp.getTime()) < 2000
          );
          if (!isDuplicate) {
            console.log('Message added successfully');
            return [...prev, newMessage];
          }
          console.log('Duplicate message detected, skipping');
          return prev;
        });
      } else {
        console.log('Empty message received, not adding to chat');
      }
    };

    const handleAssistantMessage = (data: any) => {
      console.log('Received assistant message:', data);
      const messageText = data.content || data.message || data.text || '';
      
      // Always clear loading state when assistant message is received
      setIsLoading(false);
      
      // Only add message if it has content
      if (messageText.trim()) {
        const newMessage: Message = {
          id: `assistant-${Date.now()}-${Math.random()}`,
          text: messageText,
          sender: 'assistant',
          timestamp: new Date()
        };
        console.log('Adding assistant message to chat:', newMessage);
        setMessages(prev => {
          // Check for duplicate messages
          const isDuplicate = prev.some(msg => 
            msg.text === messageText && 
            msg.sender === 'assistant' && 
            Math.abs(msg.timestamp.getTime() - newMessage.timestamp.getTime()) < 2000
          );
          if (!isDuplicate) {
            console.log('Assistant message added successfully');
            return [...prev, newMessage];
          }
          console.log('Duplicate assistant message detected, skipping');
          return prev;
        });
      } else {
        console.log('Empty assistant message received, not adding to chat');
      }
    };

    const handleUserMessage = (data: any) => {
      console.log('Received user message:', data);
      // Don't add user messages here as they're already added when sending
    };

    const handleSessionJoined = (data: any) => {
      // Load chat history if available, filtering out empty messages
      if (data.chatHistory && Array.isArray(data.chatHistory)) {
        const validMessages = data.chatHistory
          .filter((msg: any) => (msg.content || msg.message || msg.text || '').trim())
          .map((msg: any) => ({
            id: msg.id || `history-${Date.now()}-${Math.random()}`,
            text: msg.content || msg.message || msg.text || '',
            sender: msg.role || msg.sender || 'user',
            timestamp: new Date(msg.timestamp || Date.now())
          }));
        
        if (validMessages.length > 0) {
          setMessages(validMessages);
        }
      }
    };

    const handleError = (error: any) => {
      console.error('Socket error:', error);
      setIsLoading(false);
      // Only show error message if it's a real error, not empty responses
      if (error && error.message && error.message !== 'Not joined to this session') {
        const errorMessage: Message = {
          id: `error-${Date.now()}-${Math.random()}`,
          text: 'Sorry, there was an error processing your request. Please try again.',
          sender: 'assistant',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    };

    // Remove existing listeners first
    socket.off('message');
    socket.off('assistant_message');
    socket.off('user_message');
    socket.off('session_joined');
    socket.off('error');

    // Add new listeners with debug logging
    socket.on('message', handleMessage);
    socket.on('assistant_message', handleAssistantMessage);
    socket.on('user_message', handleUserMessage);
    socket.on('session_joined', handleSessionJoined);
    socket.on('error', handleError);
    
    // Add catch-all listener to see what events are being received
    socket.onAny((eventName, ...args) => {
      console.log('Socket event received:', eventName, args);
    });

    return () => {
      socket.off('message', handleMessage);
      socket.off('assistant_message', handleAssistantMessage);
      socket.off('user_message', handleUserMessage);
      socket.off('session_joined', handleSessionJoined);
      socket.off('error', handleError);
    };
  }, [socket]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const sessionId = await getOrCreateSession();
      if (socket && sessionId) {
        // First join the session, then send the message
        socket.emit('join_session', { sessionId });
        
        // Wait a moment for session join to complete, then send message
        setTimeout(() => {
          socket.emit('message', {
            sessionId,
            message: userMessage.text,
            timestamp: new Date().toISOString()
          });
          
          // Set a timeout to clear loading if no response comes
          setTimeout(() => {
            if (isLoading) {
              console.log('No response received, clearing loading state');
              setIsLoading(false);
            }
          }, 30000); // 30 second timeout
        }, 100);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsLoading(false);
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.setAttribute('data-theme', !isDarkMode ? 'dark' : 'light');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  return (
    <div className={`app ${isDarkMode ? 'dark' : ''}`}>
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-icon">
              <MessageSquare size={20} />
            </div>
            <span>RAG News Chat</span>
          </div>
          
          <div className="header-actions">
            <button className="theme-toggle" onClick={toggleTheme}>
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              <span>{isDarkMode ? 'Light' : 'Dark'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="chat-container">
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="welcome-message">
                <div className="welcome-icon">
                  <MessageSquare size={48} />
                </div>
                <h2>Welcome to RAG News Chat</h2>
                <p>Ask me anything about the latest news from around the world. I have access to 55+ news sources including Indian publications!</p>
                <div className="example-questions">
                  <button 
                    className="example-btn"
                    onClick={() => setInputText("What's the latest news in India?")}
                  >
                    What's the latest news in India?
                  </button>
                  <button 
                    className="example-btn"
                    onClick={() => setInputText("Tell me about recent technology developments")}
                  >
                    Tell me about recent technology developments
                  </button>
                  <button 
                    className="example-btn"
                    onClick={() => setInputText("What's happening in sports today?")}
                  >
                    What's happening in sports today?
                  </button>
                </div>
              </div>
            )}
            
            {messages.map((message) => (
              <div key={message.id} className={`message message-${message.sender}`}>
                <div className="message-avatar">
                  {message.sender === 'user' ? '👤' : '🤖'}
                </div>
                <div className="message-content">
                  <p className="message-text">{message.text}</p>
                  <div className="message-time">{formatTime(message.timestamp)}</div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="message message-assistant thinking">
                <div className="message-avatar">🤖</div>
                <div className="message-content thinking-message">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <p className="message-text">Analyzing news articles...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-container">
            <form onSubmit={handleSubmit} className="chat-input-form">
              <div className="chat-input-wrapper">
                <textarea
                  className="chat-input"
                  value={inputText}
                  onChange={handleInputChange}
                  placeholder="Ask me about the latest news..."
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
              </div>
              <button 
                type="submit" 
                className="send-button"
                disabled={!inputText.trim() || isLoading}
                title="Send message"
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
