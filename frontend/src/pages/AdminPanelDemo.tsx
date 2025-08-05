import React from 'react';
import { AdminPanel } from '../components/admin';

const AdminPanelDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel Demo</h1>
          <p className="mt-2 text-gray-600">
            Interactive dashboard for system monitoring and management
          </p>
        </div>
        
        <AdminPanel className="space-y-6" />
      </div>
    </div>
  );
};

export default AdminPanelDemo;
