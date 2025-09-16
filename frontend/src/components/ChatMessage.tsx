import React from 'react';
import { User, Bot } from 'lucide-react';
import type { Message } from '../types';
import { clsx } from 'clsx';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  return (
    <div className={clsx('message', {
      'message-user': isUser,
      'message-assistant': !isUser
    })}>
      <div className="message-avatar" style={{
        backgroundColor: isUser ? 'var(--primary-color)' : 'var(--accent-color)'
      }}>
        {isUser ? (
          <User size={16} color="white" />
        ) : (
          <Bot size={16} color="white" />
        )}
      </div>
      
      <div className="message-content">
        <p className="message-text">{message.content}</p>
        <div className="message-time">
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
};
