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
    <header className="bg-gray-900 border-b border-gray-700/30 px-4 py-3">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {/* Left side with hamburger menu and title */}
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-gray-800 rounded-lg transition-all duration-300"
            aria-label="Toggle sidebar"
          >
            <HiBars3 className="w-6 h-6 text-white" />
          </button>
          
          <h1 className="text-white text-lg font-medium truncate">
            New chat
          </h1>
        </div>

        {/* Right side with buttons */}
        <div className="flex items-center gap-2 relative">
          {/* Contextual Prompts Button */}
          <div className="relative">
            <button
              onClick={onToggleContextualPrompts}
              className={`p-2 hover:bg-gray-800 rounded-lg transition-all duration-300 relative group ${
                showContextualPrompts ? 'bg-gray-800 text-blue-400' : 'text-gray-300'
              }`}
              title="View Context & Prompts"
            >
              <HiBookmark className="w-5 h-5 group-hover:text-white transition-colors duration-200" />
              {messages.length > 1 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full opacity-80 animate-pulse"></div>
              )}
            </button>

            {/* Contextual Prompts Dropdown */}
            {showContextualPrompts && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-gray-800 rounded-xl border border-gray-700/50 shadow-2xl z-50 max-h-96 overflow-y-auto animate-scale-in">
                <div className="p-4 border-b border-gray-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <HiChatBubbleLeftRight className="w-5 h-5 text-blue-400" />
                    <h3 className="text-lg font-bold text-white">Conversation Context</h3>
                  </div>
                  <p className="text-sm text-gray-400">
                    {messages.length > 1 ? 'Context is active for this conversation' : 'Start chatting to build context'}
                  </p>
                </div>

                <div className="p-4">
                  {/* Context Stats */}
                  {messages.length > 1 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <HiBoltSlash className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-300">Context Stats</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Total Messages:</span>
                          <span className="text-white font-medium">{messages.length}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">User Messages:</span>
                          <span className="text-white font-medium">{messages.filter(m => m.type === 'user').length}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">AI Responses:</span>
                          <span className="text-white font-medium">{messages.filter(m => m.type === 'assistant').length}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recent Context */}
                  {conversationContext && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <HiSparkles className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm font-medium text-gray-300">Active Context</span>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                        <p className="text-sm text-gray-300 line-clamp-3">
                          {conversationContext}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Suggested Prompts */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <HiBookmark className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-medium text-gray-300">Suggested Prompts</span>
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
                             // Here you can add functionality to use these prompts
                             console.log('Selected prompt:', prompt);
                           }}
                           className="w-full text-left p-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all duration-200 border border-gray-700/30 hover:border-gray-600/50"
                         >
                           {prompt}
                         </button>
                       ))}
                    </div>
                  </div>

                  {/* Empty state */}
                  {messages.length <= 1 && (
                    <div className="text-center py-6">
                      <div className="w-12 h-12 bg-gray-700 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <HiChatBubbleLeftRight className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-400 mb-2">No context yet</p>
                      <p className="text-xs text-gray-500">Start a conversation to see contextual prompts</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* New Chat Button */}
          <button
            onClick={onNewChat}
            className="p-2 hover:bg-gray-800 rounded-lg transition-all duration-300"
            title="New chat"
          >
            <HiPlus className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header; 