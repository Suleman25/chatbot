import React from 'react';
import { HiOutlineChatBubbleLeft, HiOutlineTrash, HiOutlinePencil, HiSparkles } from 'react-icons/hi2';

const Sidebar = ({ isOpen, chatHistory, currentChatId, onSelectChat, onDeleteChat, onEditChat, onClose }) => {
  return (
    <div className={`
      fixed inset-y-0 left-0 z-50 w-64 sm:w-72 md:w-80 bg-white dark:bg-gray-900 transform transition-all duration-300 ease-in-out border-r border-gray-200 dark:border-gray-800 shadow-2xl
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
      <div className="flex flex-col h-full relative z-50">
        {/* Sidebar Header - Mobile optimized */}
        <div className="p-2 sm:p-3 md:p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent mb-1 sm:mb-2 tracking-tight">
            Chat History
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
            {chatHistory.length} conversation{chatHistory.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Chat List - Mobile optimized */}
        <div className="flex-1 overflow-y-auto p-1 sm:p-2 md:p-3 space-y-1 sm:space-y-2">
          {chatHistory.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <HiOutlineChatBubbleLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 dark:text-gray-400" />
              </div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">
                No conversations yet
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Start a new chat to begin
              </p>
            </div>
          ) : (
            chatHistory.map((chat, index) => (
              <div
                key={chat.id}
                className={`
                  group relative p-2 sm:p-2.5 md:p-3 rounded-lg cursor-pointer transition-all duration-200 touch-manipulation min-h-[44px] flex items-center
                  ${currentChatId === chat.id
                    ? 'bg-blue-50 dark:bg-gray-800 border border-blue-200 dark:border-gray-700'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-750'
                  }
                `}
                onClick={() => onSelectChat(chat.id)}
              >
                {/* Chat content */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {/* Chat title */}
                    <h3 className={`
                      font-medium text-xs sm:text-sm md:text-base truncate mb-0.5 sm:mb-1 leading-tight
                      ${currentChatId === chat.id 
                        ? 'text-blue-900 dark:text-white' 
                        : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white'
                      }
                    `}>
                      {chat.title}
                    </h3>
                    
                    {/* Chat metadata */}
                    <div className="flex items-center gap-1 sm:gap-2 text-xs text-gray-500 dark:text-gray-500">
                      <span className="text-xs">{chat.messages?.length || 0} msg{(chat.messages?.length || 0) !== 1 ? 's' : ''}</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="text-xs hidden sm:inline">{new Date(chat.lastUpdated).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  {/* Action buttons - Better mobile touch targets */}
                  <div className={`
                    flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200
                    ${currentChatId === chat.id ? 'opacity-100' : ''}
                  `}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditChat(chat.id);
                      }}
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-all duration-200 touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
                      title="Edit chat title"
                    >
                      <HiOutlinePencil className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white" />
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Are you sure you want to delete this chat?')) {
                          onDeleteChat(chat.id);
                        }
                      }}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-600 rounded transition-all duration-200 touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
                      title="Delete chat"
                    >
                      <HiOutlineTrash className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-white" />
                    </button>
                  </div>
                </div>
                
                {/* Active indicator */}
                {currentChatId === chat.id && (
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-r"></div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Sidebar Footer - Mobile optimized */}
        <div className="p-2 sm:p-3 md:p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-1 sm:gap-2 text-xs text-gray-400 dark:text-gray-500 px-2 sm:px-3 py-1 sm:py-2">
              <HiSparkles className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="font-medium text-xs">Smart Buddy v1.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar; 