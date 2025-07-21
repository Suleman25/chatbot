import React from 'react';
import { HiBars3, HiPlus, HiArrowPath, HiSparkles, HiSun, HiMoon, HiBookmark, HiChatBubbleLeftRight, HiBoltSlash } from 'react-icons/hi2';

const Header = ({ 
  onToggleSidebar, 
  onNewChat, 
  error, 
  onRetry, 
  darkMode, 
  onToggleDarkMode,
  onToggleContextualPrompts,
  showContextualPrompts,
  messages,
  conversationContext
}) => {
  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700/30 px-3 sm:px-4 py-2 sm:py-3">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {/* Left side with hamburger menu and title */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-300 flex-shrink-0 touch-manipulation"
            aria-label="Toggle sidebar"
          >
            <HiBars3 className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700 dark:text-white" />
          </button>
          
          <h1 className="text-gray-900 dark:text-white text-base sm:text-lg font-medium truncate">
            New chat
          </h1>
        </div>

        {/* Right side with buttons */}
        <div className="flex items-center gap-1 sm:gap-2 relative flex-shrink-0">
          {/* Contextual Prompts Button - Now visible on mobile */}
          <div className="relative">
            <button
              onClick={onToggleContextualPrompts}
              className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-300 relative group touch-manipulation ${
                showContextualPrompts ? 'bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'
              }`}
              title="View Context & Prompts"
            >
              <HiBookmark className="w-4 h-4 sm:w-5 sm:h-5 group-hover:text-blue-600 dark:group-hover:text-white transition-colors duration-200" />
              {messages.length > 1 && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-blue-600 rounded-full opacity-80 animate-pulse"></div>
              )}
            </button>

            {/* Contextual Prompts Dropdown */}
            {showContextualPrompts && (
              <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700/50 shadow-2xl z-50 max-h-80 sm:max-h-96 overflow-y-auto animate-scale-in">
                <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <HiChatBubbleLeftRight className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Conversation Context</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    {messages.length > 1 ? 'Context is active for this conversation' : 'Start chatting to build context'}
                  </p>
                </div>

                <div className="p-3 sm:p-4">
                  {/* Context Stats */}
                  {messages.length > 1 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <HiBoltSlash className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Context Stats</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Total Messages:</span>
                          <span className="text-gray-900 dark:text-white font-medium">{messages.length}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">User Messages:</span>
                          <span className="text-gray-900 dark:text-white font-medium">{messages.filter(m => m.type === 'user').length}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">AI Responses:</span>
                          <span className="text-gray-900 dark:text-white font-medium">{messages.filter(m => m.type === 'assistant').length}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recent Context */}
                  {conversationContext && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <HiSparkles className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Context</span>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700/30">
                        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                          {conversationContext}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Suggested Prompts */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <HiBookmark className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Suggested Prompts</span>
                    </div>
                    <div className="space-y-2">
                      {[
                        "Summarize our conversation",
                        "Continue where we left off", 
                        "Explain that in more detail",
                        "What else should I know?"
                      ].map((prompt, index) => (
                        <button
                          key={index}
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle prompt selection here
                          }}
                          className="w-full text-left p-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Retry Button */}
          {error && (
            <button
              onClick={onRetry}
              className="p-2 hover:bg-red-50 dark:hover:bg-gray-800 rounded-lg transition-all duration-300 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 touch-manipulation"
              title="Retry last message"
            >
              <HiArrowPath className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}

          {/* New Chat Button */}
          <button
            onClick={onNewChat}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-300 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white touch-manipulation"
            title="Start new chat"
          >
            <HiPlus className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Dark Mode Toggle - Now visible on mobile */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-300 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white touch-manipulation"
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? (
              <HiSun className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <HiMoon className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header; 