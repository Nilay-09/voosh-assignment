import React from 'react';
import { MessageSquare, Moon, Sun, Menu } from 'lucide-react';
import type { Theme } from '../types';
import { clsx } from 'clsx';

interface HeaderProps {
  theme: Theme['name'];
  onThemeToggle: () => void;
  onMenuToggle: () => void;
  isConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onThemeToggle,
  onMenuToggle,
  isConnected
}) => {
  return (
    <header className="app-header">
      <div className="container">
        <div className="header-content">
          <div className="flex items-center gap-md">
            <button
              onClick={onMenuToggle}
              className="mobile-menu-toggle"
            >
              <Menu size={20} />
            </button>
            
            <div className="logo">
              <div className="logo-icon">
                <MessageSquare size={20} />
              </div>
              <span>RAG News Chatbot</span>
            </div>
          </div>
          
          <div className="header-actions">
            <div className={clsx(
              'flex items-center gap-sm px-sm py-xs rounded-md text-xs',
              isConnected ? 'bg-success-color' : 'bg-error-color'
            )}>
              <div className={clsx(
                'w-2 h-2 rounded-full',
                isConnected ? 'bg-white' : 'bg-white opacity-70'
              )} />
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
            
            <button
              onClick={onThemeToggle}
              className="theme-toggle"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
