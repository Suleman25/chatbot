import React from 'react';
import { HiOutlineChatBubbleLeft, HiOutlineTrash, HiOutlinePencil, HiSparkles } from 'react-icons/hi2';

const Sidebar = ({ isOpen, chatHistory, currentChatId, onSelectChat, onDeleteChat, onEditChat, onClose }) => {
  return (
    <div className={`
      fixed inset-y-0 left-0 z-50 w-72 bg-gray-900 transform transition-all duration-300 ease-in-out border-r border-gray-800
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
      <div className="flex flex-col h-full">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent mb-2 tracking-tight">
            Chat History
          </h2>
          <p className="text-gray-400 text-sm">
            {chatHistory.length} conversations
          </p>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {chatHistory.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center mx-auto mb-4">
                <HiOutlineChatBubbleLeft className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-400 font-medium">
                No conversations yet
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Start a new chat to begin
              </p>
            </div>
          ) : (
            chatHistory.map((chat, index) => (
              <div
                key={chat.id}
                className={`
                  group relative p-3 rounded-lg cursor-pointer transition-all duration-200
                  ${currentChatId === chat.id
                    ? 'bg-gray-800'
                    : 'hover:bg-gray-800'
                  }
                `}
                onClick={() => onSelectChat(chat.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center">
                    <HiOutlineChatBubbleLeft className="w-4 h-4 text-gray-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className={`
                      font-medium text-sm truncate mb-1
                      ${currentChatId === chat.id ? 'text-white' : 'text-gray-300'}
                    `}>
                      {chat.title}
                    </h3>
                    
                    <p className="text-xs text-gray-500">
                      {new Date(chat.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className={`
                  absolute top-2 right-2 flex gap-1 transition-all duration-300
                  ${currentChatId === chat.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                `}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditChat(chat.id);
                    }}
                    className="p-1 hover:bg-gray-700 rounded transition-all duration-200"
                    title="Edit chat title"
                  >
                    <HiOutlinePencil className="w-3 h-3 text-gray-400 hover:text-white" />
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Are you sure you want to delete this chat?')) {
                        onDeleteChat(chat.id);
                      }
                    }}
                    className="p-1 hover:bg-red-600 rounded transition-all duration-200"
                    title="Delete chat"
                  >
                    <HiOutlineTrash className="w-3 h-3 text-gray-400 hover:text-white" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2 text-xs text-gray-500 px-3 py-2">
              <HiSparkles className="w-4 h-4" />
              <span className="font-medium">My Chatbot v1.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar; 