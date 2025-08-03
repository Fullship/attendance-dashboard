import { PerformanceTracker } from './datadog';

/**
 * Enhanced API service with Datadog monitoring
 */
class MonitoredAPIService {
  private baseURL: string;

  constructor(baseURL: string = process.env.REACT_APP_API_URL || 'http://localhost:3001/api') {
    this.baseURL = baseURL;
  }

  /**
   * Monitored fetch wrapper with Datadog integration
   */
  private async monitoredFetch(
    endpoint: string,
    options: RequestInit = {},
    customMetrics?: Record<string, any>
  ): Promise<Response> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
    const method = options.method || 'GET';
    const startTime = performance.now();

    // Add trace headers for distributed tracing
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    let response: Response;
    let status = 0;
    let error: Error | null = null;

    try {
      response = await fetch(url, { ...options, headers });
      status = response.status;

      // Track successful API call
      const duration = performance.now() - startTime;
      PerformanceTracker.trackAPICall(endpoint, method, duration, status);

      // Add custom metrics if provided
      if (customMetrics) {
        PerformanceTracker.trackUserAction('api-call-custom', {
          endpoint,
          method,
          status,
          duration,
          ...customMetrics,
        });
      }

      return response;
    } catch (err: any) {
      error = err;
      status = 0; // Network error
      const duration = performance.now() - startTime;

      // Track failed API call
      PerformanceTracker.trackAPICall(endpoint, method, duration, status);
      PerformanceTracker.trackError(err, {
        endpoint,
        method,
        type: 'api-error',
        networkError: true,
      });

      throw err;
    }
  }

  /**
   * GET request with monitoring
   */
  async get<T>(endpoint: string, customMetrics?: Record<string, any>): Promise<T> {
    const response = await this.monitoredFetch(endpoint, { method: 'GET' }, customMetrics);

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`GET ${endpoint} failed: ${response.status} ${errorData}`);
    }

    return response.json();
  }

  /**
   * POST request with monitoring
   */
  async post<T>(endpoint: string, data?: any, customMetrics?: Record<string, any>): Promise<T> {
    const response = await this.monitoredFetch(
      endpoint,
      {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      },
      customMetrics
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`POST ${endpoint} failed: ${response.status} ${errorData}`);
    }

    return response.json();
  }

  /**
   * PUT request with monitoring
   */
  async put<T>(endpoint: string, data?: any, customMetrics?: Record<string, any>): Promise<T> {
    const response = await this.monitoredFetch(
      endpoint,
      {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
      },
      customMetrics
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`PUT ${endpoint} failed: ${response.status} ${errorData}`);
    }

    return response.json();
  }

  /**
   * DELETE request with monitoring
   */
  async delete<T>(endpoint: string, customMetrics?: Record<string, any>): Promise<T> {
    const response = await this.monitoredFetch(endpoint, { method: 'DELETE' }, customMetrics);

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`DELETE ${endpoint} failed: ${response.status} ${errorData}`);
    }

    return response.json();
  }

  /**
   * Upload file with progress monitoring
   */
  async uploadFile(
    endpoint: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    const startTime = performance.now();
    let xhr: XMLHttpRequest;

    return new Promise((resolve, reject) => {
      xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', event => {
        if (event.lengthComputable && onProgress) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);

          // Track progress milestones
          if (progress === 25 || progress === 50 || progress === 75) {
            PerformanceTracker.trackUserAction('file-upload-progress', {
              endpoint,
              filename: file.name,
              filesize: file.size,
              progress,
            });
          }
        }
      });

      // Handle upload completion
      xhr.addEventListener('load', () => {
        const duration = performance.now() - startTime;
        const status = xhr.status;

        // Track upload completion
        PerformanceTracker.trackAPICall(endpoint, 'POST', duration, status);
        PerformanceTracker.trackUserAction('file-upload-complete', {
          endpoint,
          filename: file.name,
          filesize: file.size,
          duration,
          status,
          success: status >= 200 && status < 300,
        });

        if (status >= 200 && status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            resolve(result);
          } catch {
            resolve(xhr.responseText);
          }
        } else {
          const error = new Error(`Upload failed: ${status} ${xhr.statusText}`);
          PerformanceTracker.trackError(error, {
            endpoint,
            filename: file.name,
            filesize: file.size,
            type: 'upload-error',
          });
          reject(error);
        }
      });

      // Handle upload errors
      xhr.addEventListener('error', () => {
        const duration = performance.now() - startTime;
        const error = new Error('Upload failed: Network error');

        PerformanceTracker.trackAPICall(endpoint, 'POST', duration, 0);
        PerformanceTracker.trackError(error, {
          endpoint,
          filename: file.name,
          filesize: file.size,
          type: 'upload-network-error',
        });

        reject(error);
      });

      // Send the request
      const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
      xhr.open('POST', url);
      xhr.send(formData);
    });
  }

  /**
   * Batch API calls with monitoring
   */
  async batchRequests<T>(
    requests: Array<{ endpoint: string; method: string; data?: any }>
  ): Promise<T[]> {
    const startTime = performance.now();

    try {
      const promises = requests.map(({ endpoint, method, data }) => {
        switch (method.toLowerCase()) {
          case 'get':
            return this.get<T>(endpoint);
          case 'post':
            return this.post<T>(endpoint, data);
          case 'put':
            return this.put<T>(endpoint, data);
          case 'delete':
            return this.delete<T>(endpoint);
          default:
            throw new Error(`Unsupported method: ${method}`);
        }
      });

      const results = await Promise.all(promises);
      const duration = performance.now() - startTime;

      // Track batch completion
      PerformanceTracker.trackUserAction('api-batch-complete', {
        requestCount: requests.length,
        duration,
        success: true,
      });

      return results;
    } catch (error: any) {
      const duration = performance.now() - startTime;

      PerformanceTracker.trackUserAction('api-batch-error', {
        requestCount: requests.length,
        duration,
        success: false,
      });

      PerformanceTracker.trackError(error, {
        type: 'batch-api-error',
        requestCount: requests.length,
      });

      throw error;
    }
  }
}

// Create a singleton instance
export const apiService = new MonitoredAPIService();

// Export types for TypeScript
export interface APIResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
}

export interface UploadResponse {
  filename: string;
  originalname: string;
  size: number;
  url?: string;
}

// Specific API endpoints with monitoring
export const attendanceAPI = {
  // Employee endpoints
  getEmployees: () => apiService.get<APIResponse>('/employees'),
  createEmployee: (data: any) =>
    apiService.post<APIResponse>('/employees', data, { operation: 'create-employee' }),
  updateEmployee: (id: string, data: any) =>
    apiService.put<APIResponse>(`/employees/${id}`, data, { operation: 'update-employee' }),
  deleteEmployee: (id: string) =>
    apiService.delete<APIResponse>(`/employees/${id}`, { operation: 'delete-employee' }),

  // Attendance endpoints
  getAttendance: (params?: Record<string, any>) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiService.get<APIResponse>(`/attendance${queryString}`, {
      operation: 'fetch-attendance',
    });
  },
  uploadAttendance: (file: File, onProgress?: (progress: number) => void) =>
    apiService.uploadFile('/attendance/upload', file, onProgress),

  // Clock requests
  getClockRequests: () =>
    apiService.get<APIResponse>('/clock-requests', { operation: 'fetch-clock-requests' }),
  updateClockRequest: (id: string, action: string) =>
    apiService.put<APIResponse>(
      `/clock-requests/${id}`,
      { action },
      { operation: 'update-clock-request' }
    ),

  // Authentication
  login: (credentials: { email: string; password: string }) =>
    apiService.post<APIResponse>('/auth/login', credentials, { operation: 'login' }),
  register: (userData: any) =>
    apiService.post<APIResponse>('/auth/register', userData, { operation: 'register' }),
  logout: () => apiService.post<APIResponse>('/auth/logout', undefined, { operation: 'logout' }),
};

export default apiService;
