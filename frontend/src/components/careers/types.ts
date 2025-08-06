/**
 * @file types.ts
 * @description Type definitions for careers page
 */

export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string; // Changed from union type to string to match mock data
  description: string;
  requirements: string[];
  postedDate: string;
  salary?: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  photo: string;
  quote: string;
  videoUrl?: string;
}

export interface Benefit {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'health' | 'financial' | 'growth' | 'lifestyle';
}
