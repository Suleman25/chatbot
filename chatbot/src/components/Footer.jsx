import React from 'react';
import { HiSparkles, HiHeart, HiCodeBracket } from 'react-icons/hi2';

const Footer = ({ developerName = "Suleman" }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700/50 py-3 sm:py-4">
      <div className="max-w-4xl mx-auto px-3 sm:px-4">
        <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-2 sm:gap-4">
          {/* Developer Info */}
          <div className="flex items-center gap-2 text-center sm:text-left">
            <div className="flex items-center gap-1.5">
              <HiCodeBracket className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Developed by{' '}
                <span className="text-blue-600 dark:text-blue-400 font-semibold">{developerName}</span>
              </span>
            </div>
          </div>

          {/* Copyright and Love */}
          <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <span>&copy; {currentYear}</span>
              <span>All rights reserved</span>
            </div>
            <div className="hidden xs:flex items-center gap-1">
              <span>Made with</span>
              <HiHeart className="w-3 h-3 text-red-500 dark:text-red-400 animate-pulse" />
              <span>and</span>
              <HiSparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        {/* Mobile-only love message */}
        <div className="xs:hidden flex items-center justify-center gap-1 text-xs text-gray-400 dark:text-gray-500 mt-1">
          <span>Made with</span>
          <HiHeart className="w-3 h-3 text-red-500 dark:text-red-400 animate-pulse" />
          <span>and</span>
          <HiSparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
