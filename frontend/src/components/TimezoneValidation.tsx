import * as React from 'react';
import { useState, useEffect } from 'react';
import { adminAPI } from '../utils/api';
import { Location } from '../types';
import { MagicCard, ShimmerButton, NumberTicker, GradientText, FadeInStagger } from './ui';

interface TimezoneValidationData {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  timezoneDistribution: Array<{
    timezone: string;
    count: number;
    locationName: string;
  }>;
  invalidEntries: Array<{
    id: number;
    timezone: string;
    error: string;
  }>;
}

const TimezoneValidation: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [validationData, setValidationData] = useState<TimezoneValidationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getLocations();
      setLocations(response.locations as any);
      if (response.locations.length > 0) {
        setSelectedLocation(response.locations[0].timezone);
      }
    } catch (err: any) {
      setError('Failed to load locations: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const validateTimezones = async () => {
    if (!selectedLocation) {
      setError('Please select a location');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      // For now, just validate with sample timestamps
      const response = await adminAPI.validateTimestamps(['2024-01-01T09:00:00'], 1, 1);
      setValidationData(response.validation);
    } catch (err: any) {
      setError('Failed to validate timezones: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getTimezoneSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminAPI.getTimezoneSummary();
      setValidationData(response.summary);
    } catch (err: any) {
      setError('Failed to get timezone summary: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <GradientText 
          className="text-3xl font-bold mb-2"
          colors={['#3b82f6', '#8b5cf6', '#ec4899']}
        >
          Timezone Validation
        </GradientText>
        <p className="text-gray-600 dark:text-gray-400">
          Validate attendance data across different timezone locations
        </p>
      </div>
      
      {error && (
        <MagicCard gradientColor="#ef4444" className="border-red-200 dark:border-red-800">
          <div className="p-4 text-red-700 dark:text-red-300">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        </MagicCard>
      )}

      <FadeInStagger className="space-y-6" staggerDelay={0.1}>
        {/* Location Selection */}
        <MagicCard gradientColor="#3b82f6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Location Selection
            </h3>
            <div>
              <label htmlFor="location-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Location
              </label>
              <select
                id="location-select"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                disabled={loading}
              >
                <option value="">Choose a location...</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.timezone}>
                    {location.name} ({location.timezone})
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <ShimmerButton
                onClick={validateTimezones}
                disabled={loading || !selectedLocation}
                background="linear-gradient(45deg, #3b82f6, #1d4ed8)"
                className="flex-1"
              >
                {loading ? 'Validating...' : 'Validate Timezone'}
              </ShimmerButton>
              
              <ShimmerButton
                onClick={getTimezoneSummary}
                disabled={loading}
                background="linear-gradient(45deg, #10b981, #059669)"
                className="flex-1"
              >
                {loading ? 'Loading...' : 'Get Timezone Summary'}
              </ShimmerButton>
            </div>
          </div>
        </MagicCard>

        {/* Validation Results */}
        {validationData && (
          <MagicCard gradientColor="#8b5cf6">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Validation Results
              </h3>
              
              {/* Summary Cards */}
              <FadeInStagger className="grid grid-cols-1 md:grid-cols-3 gap-4" staggerDelay={0.1}>
                <MagicCard gradientColor="#3b82f6" className="p-0">
                  <div className="text-center p-6">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      <NumberTicker value={validationData.totalRecords} />
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Records</div>
                  </div>
                </MagicCard>
                
                <MagicCard gradientColor="#10b981" className="p-0">
                  <div className="text-center p-6">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      <NumberTicker value={validationData.validRecords} />
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Valid Records</div>
                  </div>
                </MagicCard>
                
                <MagicCard gradientColor="#ef4444" className="p-0">
                  <div className="text-center p-6">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      <NumberTicker value={validationData.invalidRecords} />
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Invalid Records</div>
                  </div>
                </MagicCard>
              </FadeInStagger>

              {/* Timezone Distribution */}
              {validationData.timezoneDistribution && validationData.timezoneDistribution.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-900 dark:text-white">
                    Timezone Distribution
                  </h4>
                  <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Timezone
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Location
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Count
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {validationData.timezoneDistribution.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {item.timezone}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {item.locationName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              <NumberTicker value={item.count} delay={index * 0.1} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Invalid Entries */}
              {validationData.invalidEntries && validationData.invalidEntries.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-900 dark:text-white">
                    Invalid Entries
                  </h4>
                  <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Timezone
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Error
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {validationData.invalidEntries.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {item.id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {item.timezone}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400">
                              {item.error}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </MagicCard>
        )}
      </FadeInStagger>
    </div>
  );
};

export default TimezoneValidation;
