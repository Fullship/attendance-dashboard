import React from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  showSidebar?: boolean;
  pendingClockRequests?: number;
  pendingLeaveRequests?: number;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  showSidebar = true,
  pendingClockRequests = 0,
  pendingLeaveRequests = 0,
}) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navbar */}
      <Navbar />

      <div className="flex h-[calc(100vh-64px)]">
        {/* Sidebar */}
        {showSidebar && (
          <Sidebar
            activeTab={activeTab}
            onTabChange={onTabChange}
            pendingClockRequests={pendingClockRequests}
            pendingLeaveRequests={pendingLeaveRequests}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
