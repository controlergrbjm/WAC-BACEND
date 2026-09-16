'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // If on login page, render full screen without sidebar/header
  if (pathname === '/login') {
    return <main>{children}</main>;
  }

  return (
    <div className="app-layout">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="app-main">
        <Header onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
        <div className="app-content">{children}</div>
      </div>
    </div>
  );
};
