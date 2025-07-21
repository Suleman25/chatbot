import React, { useState } from 'react';
import { HiOutlineUser, HiOutlineClipboard, HiOutlineHeart, HiOutlineCheck, HiSparkles } from 'react-icons/hi2';
import { RiRobot2Line } from 'react-icons/ri';

const Message = ({ message, onCopy, onLike }) => {
  const { type, content, timestamp, isLiked, isError } = message;
  const isUser = type === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    onCopy(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatContent = (text) => {
    let formatted = text;
    
    // Bold text **text**
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-900 dark:text-white">$1</strong>');
    
    // Italic text *text*
    formatted = formatted.replace(/(?<!\*)\*(?!\*)([^*]+)\*(?!\*)/g, '<em class="italic text-gray-700 dark:text-gray-200">$1</em>');
    
    // Code blocks ```code```
    formatted = formatted.replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 dark:bg-gray-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl overflow-x-auto my-3 sm:my-4 border border-gray-200 dark:border-gray-600/50 shadow-sm text-sm sm:text-base"><code class="font-mono text-gray-800 dark:text-gray-200">$1</code></pre>');
    
    // Inline code `code`
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs sm:text-sm font-mono border border-gray-200 dark:border-gray-600/50 shadow-sm text-gray-800 dark:text-gray-200">$1</code>');
    
    // Line breaks
    formatted = formatted.replace(/\n/g, '<br/>');
    
    return formatted;
  };

  return (
    <div className={`
      flex gap-3 sm:gap-4 p-3 sm:p-4 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800/30
      ${isUser ? 'bg-transparent' : 'bg-white dark:bg-gray-800/20'} 
      ${isError ? 'border-l-4 border-red-500 bg-red-50 dark:bg-red-900/10' : ''}
      border-b border-gray-200 dark:border-gray-700/30 last:border-b-0 rounded-lg mb-2
    `}>
      
      {/* Avatar Section - Mobile optimized */}
      <div className={`
        flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center transform hover:scale-105 transition-all duration-300
        ${isUser 
          ? 'bg-gray-200 dark:bg-gray-700' 
          : isError 
            ? 'bg-red-600' 
            : 'bg-blue-600 hover:bg-blue-500'
        }
      `}>
        {isUser ? (
          <HiOutlineUser className="w-4 h-4 sm:w-5 md:w-6 sm:h-5 md:h-6 text-gray-700 dark:text-white" />
        ) : (
          <RiRobot2Line className="w-4 h-4 sm:w-5 md:w-6 sm:h-5 md:h-6 text-white animate-pulse" />
        )}
      </div>

      {/* Message Content Section */}
      <div className="flex-1 min-w-0">
        {/* Header - Mobile optimized */}
        <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 flex-wrap">
          <span className={`
            font-bold text-base sm:text-lg md:text-xl tracking-tight
            ${isError 
              ? 'text-red-600 dark:text-red-400' 
              : isUser 
                ? 'text-gray-900 dark:text-white'
                : 'bg-gradient-to-r from-blue-600 to-blue-800 dark:from-white dark:via-blue-100 dark:to-white bg-clip-text text-transparent'
            }
          `}>
            {isUser ? 'You' : isError ? 'System Error' : 'Smart Buddy'}
          </span>
          
          <span className="text-xs text-gray-500 dark:text-gray-500 bg-gray-100 dark:bg-gray-800/50 px-2 py-0.5 sm:py-1 rounded flex-shrink-0">
            {new Date(timestamp).toLocaleTimeString()}
          </span>
        </div>

        {/* Content - Mobile optimized */}
        <div className="prose prose-gray prose-invert max-w-none">
          <div 
            className={`
              leading-relaxed text-sm sm:text-base break-words
              ${isError 
                ? 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 p-2 sm:p-3 rounded-lg sm:rounded-xl border border-red-200 dark:border-red-700/50' 
                : 'text-gray-800 dark:text-gray-200'
              }
            `}
            dangerouslySetInnerHTML={{ __html: formatContent(content) }}
          />
        </div>

        {/* Actions Section - Mobile optimized */}
        {!isUser && (
          <div className="flex items-center justify-between mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-gray-200 dark:border-gray-700/50">
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              <button
                onClick={handleCopy}
                className={`
                  group flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg transition-all duration-200 font-medium touch-manipulation
                  ${copied 
                    ? 'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/20' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                  }
                `}
              >
                {copied ? (
                  <>
                    <HiOutlineCheck className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <HiOutlineClipboard className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>Copy</span>
                  </>
                )}
              </button>
              
              {!isError && (
                <button
                  onClick={() => onLike(message.id)}
                  className={`
                    group flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg transition-all duration-200 font-medium touch-manipulation
                    ${isLiked 
                      ? 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/20' 
                      : 'text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                    }
                  `}
                >
                  <HiOutlineHeart className={`w-3 h-3 sm:w-4 sm:h-4 ${isLiked ? 'fill-current' : ''}`} />
                  <span>{isLiked ? 'Liked' : 'Like'}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Message; 