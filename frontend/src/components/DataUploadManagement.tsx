/**
 * @file DataUploadManagement.tsx
 * @description Data upload management component moved to Settings tab
 */

import React from 'react';
import { FileUpload } from '../types';

interface DataUploadManagementProps {
  uploads?: FileUpload[];
  loading?: boolean;
  uploading?: boolean;
  onFileUpload?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRefresh?: () => void;
}

const DataUploadManagement: React.FC<DataUploadManagementProps> = ({
  uploads = [],
  loading = false,
  uploading = false,
  onFileUpload,
  onRefresh,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Data Upload Management
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Upload CSV and Excel files to import attendance data
        </p>
      </div>

      {/* Upload Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h4 className="text-md font-medium text-gray-900 dark:text-white">
            Upload Attendance Data
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Select CSV or Excel file with attendance records
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label
              htmlFor="attendanceFile"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Select Attendance File
            </label>
            <input
              type="file"
              id="attendanceFile"
              accept=".csv,.xlsx"
              onChange={onFileUpload}
              disabled={uploading}
              className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {uploading && (
              <p className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                Upload in progress... Please wait.
              </p>
            )}
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p className="font-medium mb-1">Supported File Formats:</p>
            <ul className="list-disc list-inside space-y-1 mb-3">
              <li>
                <strong>CSV:</strong> email, date, clock_in, clock_out, status, notes
              </li>
              <li>
                <strong>Excel:</strong> First Name, Last Name, ID, Date, Clock-In Time, Clock-Out
                Time, Attendance Status, Worked Hours
              </li>
            </ul>
            <p className="font-medium mb-1">Format Requirements:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Input date formats: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY</li>
              <li>Display format: DD/MMM/YYYY (e.g., 04/Jul/2025)</li>
              <li>Time formats: HH:MM, HH:MM:SS, h:mm AM/PM</li>
              <li>Status: present, absent, late, early_leave</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Upload History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h4 className="text-md font-medium text-gray-900 dark:text-white">
              Upload History
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Recent CSV uploads
            </p>
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        <div className="p-6">
          {uploads.length === 0 ? (
            <div className="text-center py-8">
              <svg
                className="w-12 h-12 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-gray-500 dark:text-gray-400">No file uploads found.</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Upload your first CSV file to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Filename
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Upload Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Records
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {uploads.slice(0, 10).map((upload, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {upload.filename || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {upload.upload_date ? new Date(upload.upload_date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          upload.status === 'completed' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : upload.status === 'failed'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                        }`}>
                          {upload.status || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {upload.records_processed || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataUploadManagement;