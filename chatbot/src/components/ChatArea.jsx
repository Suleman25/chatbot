import React, { useEffect, useRef } from 'react';
import Message from './Message';
import { RiRobot2Line } from 'react-icons/ri';
import { HiSparkles, HiChatBubbleLeftRight, HiBoltSlash } from 'react-icons/hi2';

const ChatArea = ({ messages, isLoading, onCopyMessage, onLikeMessage, error, conversationContext }) => {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900 relative overflow-hidden px-4 sm:px-6">
        <div className="relative text-center max-w-lg mx-auto p-4 sm:p-8">
          {/* 3D Animated Bot Logo - Mobile optimized */}
          <div className="relative mb-6 sm:mb-8">
            <div className="w-16 h-16 sm:w-20 md:w-24 sm:h-20 md:h-24 mx-auto relative">
              {/* Main Logo with 3D effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-blue-600 to-blue-800 rounded-2xl sm:rounded-3xl transform rotate-12 animate-spin-slow shadow-xl sm:shadow-2xl"></div>
              <div className="absolute inset-0 bg-gradient-to-tl from-blue-500 via-blue-700 to-blue-900 rounded-2xl sm:rounded-3xl transform -rotate-12 animate-pulse shadow-lg sm:shadow-xl"></div>
              <div className="relative w-full h-full bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl sm:rounded-3xl flex items-center justify-center transform hover:scale-110 transition-all duration-700 hover:rotate-45 shadow-xl sm:shadow-2xl border border-blue-400/20">
                <HiSparkles className="w-8 h-8 sm:w-10 md:w-12 sm:h-10 md:h-12 text-white animate-bounce drop-shadow-lg" />
                {/* Floating particles */}
                <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full animate-ping opacity-60"></div>
                <div className="absolute -bottom-1 -left-1 sm:-bottom-2 sm:-left-2 w-1 h-1 sm:w-1.5 sm:h-1.5 bg-blue-200 rounded-full animate-pulse opacity-80"></div>
                <div className="absolute top-1 left-1 sm:top-2 sm:left-2 w-0.5 h-0.5 sm:w-1 sm:h-1 bg-white rounded-full animate-bounce opacity-90"></div>
              </div>
              {/* Outer glow rings */}
              <div className="absolute -inset-2 sm:-inset-4 bg-gradient-to-r from-blue-400/10 via-blue-500/20 to-blue-600/10 rounded-full blur-lg sm:blur-xl animate-spin-reverse opacity-60"></div>
              <div className="absolute -inset-3 sm:-inset-6 bg-gradient-to-r from-transparent via-blue-400/5 to-transparent rounded-full blur-xl sm:blur-2xl animate-pulse"></div>
            </div>
          </div>
          
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-white dark:via-blue-100 dark:to-white bg-clip-text text-transparent mb-3 sm:mb-4 tracking-tight">
            Hi, I'm Smart Buddy.
          </h3>
          
          <p className="text-gray-600 dark:text-gray-300 mb-6 sm:mb-8 text-base sm:text-lg md:text-xl font-light tracking-wide">
            How can I help you today?
          </p>

        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 px-3 sm:px-4 md:px-6 py-3 sm:py-4">
      <div className="max-w-4xl mx-auto relative">

        {messages.map((message) => (
          <Message
            key={message.id}
            message={message}
            onCopy={onCopyMessage}
            onLike={onLikeMessage}
          />
        ))}
        
        {isLoading && (
          <div className="flex gap-3 sm:gap-4 p-3 sm:p-4 bg-blue-50 dark:bg-gray-800/20 border-l-4 border-blue-600 mb-2 sm:mb-3 rounded-r-lg">
            <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center animate-pulse">
              <RiRobot2Line className="w-4 h-4 sm:w-5 md:w-6 sm:h-5 md:h-6 text-white animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <span className="font-medium text-gray-900 dark:text-white text-sm sm:text-base md:text-lg">Smart Buddy</span>
                <span className="text-xs px-2 py-1 bg-blue-600/20 text-blue-600 dark:text-blue-400 rounded-full font-medium animate-pulse">
                  Typing...
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-600 dark:bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatArea; 