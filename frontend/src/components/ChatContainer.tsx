import React, { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import type { Message } from '../types';
import { MessageSquare } from 'lucide-react';

interface ChatContainerProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  isConnected: boolean;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  messages,
  onSendMessage,
  isLoading,
  isConnected
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="mb-lg">
              <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mb-md mx-auto">
                <MessageSquare size={32} color="white" />
              </div>
              <h2 className="text-2xl font-semibold mb-sm">Welcome to RAG News Chatbot</h2>
              <p className="text-muted max-w-md">
                Ask me anything about the latest news! I have access to real-time news from 
                trusted sources like BBC, CNN, Reuters, TechCrunch, and more.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md max-w-2xl">
              <div className="card p-md">
                <h4 className="font-medium mb-sm">📰 Latest News</h4>
                <p className="text-sm text-muted">
                  "What are the top news stories today?"
                </p>
              </div>
              
              <div className="card p-md">
                <h4 className="font-medium mb-sm">🔍 Specific Topics</h4>
                <p className="text-sm text-muted">
                  "Tell me about recent developments in AI"
                </p>
              </div>
              
              <div className="card p-md">
                <h4 className="font-medium mb-sm">💼 Business News</h4>
                <p className="text-sm text-muted">
                  "What's happening in the tech industry?"
                </p>
              </div>
              
              <div className="card p-md">
                <h4 className="font-medium mb-sm">🌍 World Events</h4>
                <p className="text-sm text-muted">
                  "Give me a summary of global news"
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      <ChatInput
        onSendMessage={onSendMessage}
        isLoading={isLoading}
        disabled={!isConnected}
        placeholder={
          !isConnected 
            ? "Connecting to server..." 
            : "Ask me anything about the news..."
        }
      />
    </div>
  );
};
