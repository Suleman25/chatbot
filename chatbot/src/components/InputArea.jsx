import React, { useState, useRef, useEffect } from 'react';
import { HiOutlinePaperAirplane, HiOutlinePaperClip, HiOutlineMicrophone, HiSparkles } from 'react-icons/hi2';

const InputArea = ({ onSendMessage, isLoading, disabled, error, onClearError }) => {
  const [message, setMessage] = useState('');
  const [charCount, setCharCount] = useState(0);
  const textareaRef = useRef(null);
  const maxLength = 4000;

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedMessage = message.trim();
    
    if (trimmedMessage && !isLoading && !disabled) {
      onSendMessage(trimmedMessage);
      setMessage('');
      setCharCount(0);
      
      if (error && onClearError) {
        onClearError();
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    
    if (error && onClearError && e.key !== 'Enter') {
      onClearError();
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setMessage(value);
      setCharCount(value.length);
      adjustTextareaHeight();
    }
  };

  useEffect(() => {
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  const isAtLimit = charCount >= maxLength;

  return (
    <div className="relative bg-gradient-to-r from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border-t border-gray-200 dark:border-gray-700/50">
      <div className="relative max-w-3xl mx-auto p-3 sm:p-4">
        {error && (
          <div className="mb-3 sm:mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs">⚠️</span>
              </div>
              <p className="text-xs sm:text-sm text-red-700 dark:text-red-300 font-medium break-words">{error}</p>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="relative">
          {/* Main Input Container */}
          <div className={`
            group flex items-end gap-2 sm:gap-3 bg-white dark:bg-gradient-to-r dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 rounded-2xl border transition-all duration-300 max-w-2xl mx-auto shadow-sm
            ${error 
              ? 'border-red-300 dark:border-red-600/50' 
              : 'border-gray-300 dark:border-gray-600/50 focus-within:border-blue-500 dark:focus-within:border-gray-500'
            } p-2 sm:p-3
          `}>
            
            {/* Attach Button - Hidden on very small screens */}
            <button
              type="button"
              className="hidden xs:flex flex-shrink-0 p-2 text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all duration-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600/50 touch-manipulation"
              title="Attach file (Coming soon)"
              disabled={true}
            >
              <HiOutlinePaperClip className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Input Container */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  disabled 
                    ? "Create a new chat to start..." 
                    : isLoading 
                      ? "Smart Buddy is thinking..." 
                      : "Message Smart Buddy"
                }
                disabled={disabled || isLoading}
                className={`
                  w-full resize-none bg-transparent border-none outline-none placeholder-gray-400 dark:placeholder-gray-500 
                  min-h-[40px] max-h-[100px] py-2 sm:py-3 px-1 sm:px-2 text-gray-900 dark:text-white font-medium text-sm sm:text-base
                  ${disabled ? 'cursor-not-allowed opacity-60' : ''}
                `}
                rows="1"
              />
            </div>

            {/* Voice Button - Hidden on very small screens */}
            <button
              type="button"
              className="hidden xs:flex flex-shrink-0 p-2 text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all duration-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600/50 touch-manipulation"
              title="Voice input (Coming soon)"
              disabled={true}
            >
              <HiOutlineMicrophone className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!message.trim() || isLoading || disabled || isAtLimit}
              className={`
                relative flex-shrink-0 p-2.5 sm:p-3 rounded-xl transition-all duration-200 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center
                ${message.trim() && !isLoading && !disabled && !isAtLimit
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg' 
                  : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }
              `}
              title={isAtLimit ? "Message is too long" : "Send to Smart Buddy"}
            >
              {isLoading ? (
                <HiSparkles className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
              ) : (
                <HiOutlinePaperAirplane className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
          </div>

        </form>
        
        {/* Smart Buddy Branding - Mobile optimized */}
        <div className="flex items-center justify-center mt-3 sm:mt-4 opacity-70">
          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 px-3 py-1 text-center">
            <HiSparkles className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="font-medium">Smart Buddy can make mistakes. Check important info.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InputArea; 