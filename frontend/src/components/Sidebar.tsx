import React from 'react';
import { Newspaper, Clock, TrendingUp, Globe, X } from 'lucide-react';
import type { NewsSource, ChatSession } from '../types';
import { clsx } from 'clsx';

interface SidebarProps {
  newsSources: NewsSource[];
  chatSessions: ChatSession[];
  currentSessionId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  newsSources,
  chatSessions,
  currentSessionId,
  isOpen,
  onClose,
  onSessionSelect,
  onNewSession
}) => {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getSourceIcon = (sourceName: string) => {
    const name = sourceName.toLowerCase();
    if (name.includes('tech') || name.includes('verge') || name.includes('ars')) {
      return <TrendingUp size={12} />;
    }
    if (name.includes('bbc') || name.includes('cnn') || name.includes('reuters')) {
      return <Globe size={12} />;
    }
    return <Newspaper size={12} />;
  };

  return (
    <>
      {/* Mobile overlay */}
      <div 
        className={clsx('overlay', { 'overlay-visible': isOpen })}
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className={clsx('sidebar', { 'sidebar-open': isOpen })}>
        {/* Mobile close button */}
        <div className="flex justify-end p-md md:hidden">
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
          >
            <X size={16} />
          </button>
        </div>

        {/* Chat Sessions */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-lg border-b border-light">
            <div className="flex items-center justify-between mb-md">
              <h3 className="font-semibold">Chat Sessions</h3>
              <button
                onClick={onNewSession}
                className="btn btn-primary btn-sm"
              >
                New Chat
              </button>
            </div>
            
            <div className="space-y-sm">
              {chatSessions.length === 0 ? (
                <p className="text-sm text-muted text-center py-lg">
                  No chat sessions yet.<br />
                  Start a new conversation!
                </p>
              ) : (
                chatSessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => onSessionSelect(session.id)}
                    className={clsx(
                      'p-sm rounded-md cursor-pointer transition-colors',
                      'hover:bg-secondary',
                      {
                        'bg-primary text-white': currentSessionId === session.id,
                        'bg-transparent': currentSessionId !== session.id
                      }
                    )}
                  >
                    <div className="flex items-center gap-sm">
                      <Clock size={14} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {session.title}
                        </p>
                        <p className="text-xs opacity-70">
                          {formatDate(session.updatedAt)} • {session.messageCount} messages
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* News Sources */}
          <div className="news-sources">
            <div className="sources-header">
              <h3>News Sources</h3>
            </div>
            
            <div className="sources-list">
              {newsSources.length === 0 ? (
                <p className="text-sm text-muted text-center py-lg">
                  Loading news sources...
                </p>
              ) : (
                newsSources.map((source, index) => (
                  <div key={index} className="source-item">
                    <div className="source-icon">
                      {getSourceIcon(source.name)}
                    </div>
                    <div className="source-info">
                      <p className="source-name">{source.name}</p>
                      <p className="source-count">
                        {source.articleCount} articles • {source.category}
                      </p>
                    </div>
                    <div className={clsx(
                      'w-2 h-2 rounded-full',
                      source.isActive ? 'bg-success-color' : 'bg-error-color'
                    )} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
