import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { CacheManager } from '../../components/admin';
import '../../index.css';

// Mock fetch for CacheManager
const mockCacheFetch = (url: string, options?: RequestInit) => {
  if (url.includes('/api/admin/cache/stats')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        hitRate: 87.5,
        missRate: 12.5,
        totalOperations: 15432,
        totalHits: 13503,
        totalMisses: 1929,
        memory: {
          used: 128 * 1024 * 1024,
          available: 512 * 1024 * 1024,
          percentage: 25
        },
        keys: {
          total: 2341,
          expired: 45,
          withTtl: 1876
        },
        performance: {
          avgResponseTime: 2.3,
          operationsPerSecond: 234.5
        },
        byType: {
          'user_sessions': { hits: 5623, misses: 234, operations: 5857 },
          'api_cache': { hits: 4521, misses: 678, operations: 5199 },
          'page_cache': { hits: 3359, misses: 1017, operations: 4376 }
        }
      })
    });
  }
  
  if (url.includes('/api/admin/cache/clear') && options?.method === 'POST') {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        message: 'Cache cleared successfully',
        keysCleared: 1234
      })
    });
  }
  
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({})
  });
};

if (typeof window !== 'undefined') {
  (window as any).fetch = mockCacheFetch;
}

const meta: Meta<typeof CacheManager> = {
  title: 'Admin/CacheManager',
  component: CacheManager,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
# CacheManager

Cache statistics and management component for monitoring Redis cache performance
and managing cache operations.

## Features

- Real-time cache statistics
- Hit/miss ratio visualization
- Memory usage monitoring
- Cache clear functionality
- Performance by cache type
- Key statistics and health monitoring
        `
      }
    }
  },
  argTypes: {
    refreshInterval: {
      control: { type: 'number', min: 1000, max: 30000, step: 1000 },
      description: 'Refresh interval in milliseconds',
      defaultValue: 5000
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes'
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    refreshInterval: 5000,
    className: 'max-w-6xl'
  }
};

export const HighPerformance: Story = {
  args: {
    refreshInterval: 5000,
    className: 'max-w-6xl'
  },
  parameters: {
    docs: {
      description: {
        story: 'Cache manager showing high performance metrics with good hit rates.'
      }
    }
  }
};

export const FastRefresh: Story = {
  args: {
    refreshInterval: 2000,
    className: 'max-w-6xl'
  },
  parameters: {
    docs: {
      description: {
        story: 'Cache manager with fast refresh for real-time monitoring.'
      }
    }
  }
};
