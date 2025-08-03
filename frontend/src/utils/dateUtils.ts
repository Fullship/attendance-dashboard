/**
 * Date formatting utilities for consistent date display across the application
 */

/**
 * Format a date string or Date object to dd/MMM/yyyy format
 * Examples: "04/Jul/2025", "15/Dec/2024"
 */
export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
  const year = dateObj.getFullYear();
  
  return `${day}/${month}/${year}`;
};

/**
 * Format a date for display with day name (e.g., "Mon, 04/Jul/2025")
 */
export const formatDateWithDay = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
  const formattedDate = formatDate(dateObj);
  
  return `${dayName}, ${formattedDate}`;
};

/**
 * Format a date range (e.g., "04/Jul/2025 - 10/Jul/2025")
 */
export const formatDateRange = (startDate: string | Date, endDate: string | Date): string => {
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
};

/**
 * Format time string to HH:MM format
 */
export const formatTime = (timeString: string | null): string => {
  if (!timeString) return 'N/A';
  
  try {
    const time = new Date(`2000-01-01T${timeString}`);
    return time.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch {
    return timeString;
  }
};

/**
 * Format datetime for display (e.g., "04/Jul/2025 14:30")
 */
export const formatDateTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  const datePart = formatDate(dateObj);
  const timePart = dateObj.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  return `${datePart} ${timePart}`;
};
