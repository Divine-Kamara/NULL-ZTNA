import React, { useState } from 'react';
import Sidebar from './Sidebar';
import NavBar from './NavBar';

const Layout = ({ children, title }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen bg-null-bg text-null-text font-sans">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div 
          onClick={toggleSidebar}
          className="fixed inset-0 z-30 bg-null-bg/80 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Main Panel Area */}
      <div className="flex flex-col min-h-screen md:pl-[240px]">
        {/* Top Navbar */}
        <NavBar toggleSidebar={toggleSidebar} title={title} />

        {/* Content Container */}
        <main className="flex-grow p-6 md:p-8 max-w-[1280px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
