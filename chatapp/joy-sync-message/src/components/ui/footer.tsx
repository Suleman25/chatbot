import React from 'react';

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="text-sm text-muted-foreground mb-4 md:mb-0">
            © {currentYear} All rights reserved.
          </div>
          <div className="text-sm text-muted-foreground">
            Developed by <span className="font-medium text-foreground">Suleman</span>
          </div>
        </div>
      </div>
    </footer>
  );
}; 