import React, { useState } from 'react';
import {
  HomeIcon,
  UsersIcon,
  CogIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  DocumentIcon,
  CalendarDaysIcon,
  ListBulletIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  children?: MenuItem[];
  count?: number;
}

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  pendingClockRequests?: number;
  pendingLeaveRequests?: number;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  pendingClockRequests = 0,
  pendingLeaveRequests = 0,
}) => {
  const [expandedSections, setExpandedSections] = useState<string[]>(['employees']);

  const menuItems: MenuItem[] = [
    {
      id: 'overview',
      label: 'Home',
      icon: HomeIcon,
    },
    {
      id: 'employees',
      label: 'Employees',
      icon: UsersIcon,
      children: [
        { id: 'employees', label: 'List', icon: ListBulletIcon },
        { id: 'org-chart', label: 'Organizational Chart', icon: BuildingOfficeIcon },
        { id: 'attendance', label: 'Attendance Records', icon: ClockIcon },
        { id: 'uploads', label: 'Data Upload', icon: DocumentIcon },
        {
          id: 'clock-requests',
          label: 'Clock Requests',
          icon: CalendarDaysIcon,
          count: pendingClockRequests,
        },
        {
          id: 'leave-requests',
          label: 'Leave Requests',
          icon: CalendarDaysIcon,
          count: pendingLeaveRequests,
        },
      ],
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: CogIcon,
    },
  ];

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId) ? prev.filter(id => id !== sectionId) : [...prev, sectionId]
    );
  };

  const handleItemClick = (itemId: string, hasChildren: boolean = false) => {
    if (hasChildren) {
      toggleSection(itemId);
    } else {
      onTabChange(itemId);
    }
  };

  const renderMenuItem = (item: MenuItem, isChild: boolean = false) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedSections.includes(item.id);
    const isActive = activeTab === item.id;
    const Icon = item.icon;

    return (
      <div key={item.id}>
        <button
          onClick={() => handleItemClick(item.id, hasChildren)}
          className={`
            w-full flex items-center justify-between px-4 py-3 text-left transition-colors duration-200
            ${isChild ? 'pl-12' : 'pl-4'}
            ${
              isActive && !hasChildren
                ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-400'
                : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
            }
          `}
        >
          <div className="flex items-center space-x-3 flex-1">
            <Icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
            {item.count !== undefined && item.count > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center">
                {item.count}
              </span>
            )}
          </div>
          {hasChildren && (
            <div className="flex-shrink-0">
              {isExpanded ? (
                <ChevronDownIcon className="w-4 h-4" />
              ) : (
                <ChevronRightIcon className="w-4 h-4" />
              )}
            </div>
          )}
        </button>

        {hasChildren && isExpanded && (
          <div className="bg-gray-50 dark:bg-gray-800/50">
            {item.children?.map(child => renderMenuItem(child, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-full flex flex-col">
      {/* Logo/Brand */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Attendance Dashboard</h1>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto">
        <div className="py-4">{menuItems.map(item => renderMenuItem(item))}</div>
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-600 dark:text-gray-400">Admin Dashboard</div>
      </div>
    </div>
  );
};

export default Sidebar;
