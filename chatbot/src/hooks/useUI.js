import { useState, useEffect } from 'react';

const useUI = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Check for dark mode preference on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
      setDarkMode(savedTheme === 'dark');
    } else {
      setDarkMode(prefersDark);
    }
  }, []);

  // Apply dark mode classes
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleSidebar = () => {
    console.log('Toggle sidebar called, current state:', sidebarOpen);
    setSidebarOpen(prev => !prev);
  };
  const closeSidebar = () => {
    console.log('Close sidebar called');
    setSidebarOpen(false);
  };
  const toggleDarkMode = () => setDarkMode(prev => !prev);

  // Close sidebar on escape key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && sidebarOpen) {
        closeSidebar();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  return {
    sidebarOpen,
    darkMode,
    toggleSidebar,
    closeSidebar,
    toggleDarkMode
  };
};

export default useUI; 