import React, { useEffect, useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import InputArea from './components/InputArea';
import Footer from './components/Footer';
import useChat from './hooks/useChat';
import useUI from './hooks/useUI';
import { HiSparkles } from 'react-icons/hi2';

const App = () => {
  const [appError, setAppError] = useState(null);

  const {
    chatHistory,
    currentChatId,
    messages,
    isLoading,
    error,
    isApiKeyValid,
    conversationContext,
    createNewChat,
    selectChat,
    deleteChat,
    updateChatTitle,
    sendMessage,
    copyMessage,
    likeMessage,
    retryLastMessage,
    clearError
  } = useChat();

  const {
    sidebarOpen,
    darkMode,
    toggleSidebar,
    closeSidebar,
    toggleDarkMode
  } = useUI();

  // State for contextual prompts dropdown
  const [showContextualPrompts, setShowContextualPrompts] = useState(false);

  const toggleContextualPrompts = () => {
    setShowContextualPrompts(!showContextualPrompts);
  };

  const closeContextualPrompts = () => {
    setShowContextualPrompts(false);
  };

  // Create initial chat on first load
  useEffect(() => {
    if (chatHistory.length === 0 && isApiKeyValid) {
      createNewChat();
    }
  }, [chatHistory.length, createNewChat, isApiKeyValid]);

  // Error boundary effect
  useEffect(() => {
    const handleError = (error) => {
      console.error('App Error:', error);
      setAppError(error.message);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', (event) => {
      handleError(new Error(event.reason));
    });

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);

  const handleEditChat = (chatId) => {
    const chat = chatHistory.find(c => c.id === chatId);
    if (chat) {
      const newTitle = prompt('Enter new title:', chat.title);
      if (newTitle && newTitle.trim()) {
        updateChatTitle(chatId, newTitle.trim());
      }
    }
  };

  // Show app error if any
  if (appError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 dark:from-gray-900 dark:via-black dark:to-gray-800 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -inset-10 opacity-20 dark:opacity-10">
            <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-gradient-to-r from-gray-400 to-gray-600 dark:from-gray-600 dark:to-gray-400 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-pulse"></div>
            <div className="absolute top-3/4 right-1/4 w-72 h-72 bg-gradient-to-r from-gray-500 to-gray-700 dark:from-gray-500 dark:to-gray-300 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-pulse" style={{ animationDelay: '2s' }}></div>
          </div>
        </div>

        <div className="relative max-w-md w-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-3xl shadow-2xl p-8 text-center border border-gray-300/50 dark:border-gray-600/50">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-700 dark:from-red-600 dark:to-red-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl border border-red-400/50">
            <HiSparkles className="w-10 h-10 text-white animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-800 dark:from-red-400 dark:to-red-200 bg-clip-text text-transparent mb-3">
            Smart Buddy Error
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 font-medium">
            {appError}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-900 dark:from-gray-600 dark:to-gray-400 hover:from-gray-600 hover:to-gray-800 dark:hover:from-gray-500 dark:hover:to-gray-300 text-white dark:text-gray-900 rounded-xl transition-all duration-300 shadow-lg transform hover:scale-105 font-medium border border-gray-600 dark:border-gray-400"
          >
            Reload Smart Buddy
          </button>
        </div>
      </div>
    );
  }

  // Show API key error prominently if not configured
  if (!isApiKeyValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-gray-200 dark:from-gray-900 dark:via-black dark:to-gray-800 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -inset-10 opacity-20 dark:opacity-10">
            <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-gradient-to-r from-gray-300 to-gray-500 dark:from-gray-600 dark:to-gray-400 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-pulse"></div>
            <div className="absolute top-3/4 right-1/4 w-72 h-72 bg-gradient-to-r from-gray-400 to-gray-600 dark:from-gray-500 dark:to-gray-300 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-pulse" style={{ animationDelay: '2s' }}></div>
            <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-gradient-to-r from-gray-200 to-gray-400 dark:from-gray-700 dark:to-gray-500 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-pulse" style={{ animationDelay: '4s' }}></div>
          </div>
        </div>

        <div className="relative max-w-lg w-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-3xl shadow-2xl p-8 text-center border border-gray-300/50 dark:border-gray-600/50">
          {/* Smart Buddy Logo */}
          <div className="relative mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-600 via-gray-800 to-black dark:from-gray-500 dark:via-gray-300 dark:to-white rounded-2xl flex items-center justify-center mx-auto shadow-2xl transform hover:rotate-12 transition-transform duration-500 border border-gray-400/50 dark:border-gray-500/50">
              <HiSparkles className="w-10 h-10 text-white dark:text-gray-900 animate-pulse" />
            </div>
            <div className="absolute -inset-4 bg-gradient-to-r from-gray-400 via-gray-600 to-gray-800 dark:from-gray-600 dark:via-gray-400 dark:to-gray-200 rounded-2xl blur opacity-20 animate-pulse"></div>
          </div>

          <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-800 via-black to-gray-700 dark:from-gray-200 dark:via-white dark:to-gray-300 bg-clip-text text-transparent mb-2">
            Smart Buddy Setup
          </h2>
          <p className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-6">
            API Key Required
          </p>
          <p className="text-gray-600 dark:text-gray-400 mb-6 font-medium">
            Please create a <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg font-mono text-sm border border-gray-300 dark:border-gray-600">.env</code> file in your project root and add:
          </p>
          
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 p-4 rounded-2xl text-left text-sm mb-6 border border-gray-200 dark:border-gray-600/50">
            <code className="text-gray-800 dark:text-gray-200 font-mono font-medium">
              VITE_GEMINI_API_KEY=your_api_key_here
            </code>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800/50 dark:to-gray-700/50 rounded-xl border border-gray-300/50 dark:border-gray-600/50">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                🔗 Get your API key from:
              </p>
              <a 
                href="https://makersuite.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white underline font-medium"
              >
                <HiSparkles className="w-4 h-4" />
                Google AI Studio
              </a>
            </div>
            
            <button 
              onClick={() => window.location.reload()} 
              className="w-full px-6 py-3 bg-gradient-to-r from-gray-700 via-gray-900 to-black dark:from-gray-600 dark:via-gray-400 dark:to-gray-200 hover:from-gray-600 hover:via-gray-800 hover:to-gray-900 dark:hover:from-gray-500 dark:hover:via-gray-300 dark:hover:to-gray-100 text-white dark:text-gray-900 rounded-xl transition-all duration-300 shadow-lg transform hover:scale-105 font-medium border border-gray-600 dark:border-gray-400"
            >
              ✨ Launch Smart Buddy
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        chatHistory={chatHistory}
        currentChatId={currentChatId}
        onSelectChat={selectChat}
        onDeleteChat={deleteChat}
        onEditChat={handleEditChat}
        onClose={closeSidebar}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header
          onToggleSidebar={toggleSidebar}
          onNewChat={createNewChat}
          error={error}
          onRetry={retryLastMessage}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
          onToggleContextualPrompts={toggleContextualPrompts}
          showContextualPrompts={showContextualPrompts}
          messages={messages}
          conversationContext={conversationContext}
        />

        {/* Chat Area */}
        <ChatArea
          messages={messages}
          isLoading={isLoading}
          onCopyMessage={copyMessage}
          onLikeMessage={likeMessage}
          error={error}
          conversationContext={conversationContext}
        />

        {/* Input Area */}
        <InputArea
          onSendMessage={sendMessage}
          isLoading={isLoading}
          disabled={!currentChatId}
          error={error}
          onClearError={clearError}
        />

        {/* Footer */}
        <Footer developerName="Suleman" />
      </div>

      {/* Overlay for sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 backdrop-blur-sm"
          onClick={closeSidebar}
        />
      )}

      {/* Overlay for contextual prompts */}
      {showContextualPrompts && (
        <div
          className="fixed inset-0 z-30"
          onClick={closeContextualPrompts}
        />
      )}
    </div>
  );
};

export default App;