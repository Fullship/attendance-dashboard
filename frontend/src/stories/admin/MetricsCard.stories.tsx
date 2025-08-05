import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { MetricsCard } from '../../components/admin';
import '../../index.css';

// Mock fetch for MetricsCard
const mockMetricsFetch = () => {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      requests: { total: 45678, rps: 23.5 },
      responseTime: { avg: 45.2, p95: 120.3, p99: 234.5 },
      memory: { used: 512 * 1024 * 1024, total: 2048 * 1024 * 1024, percentage: 25.0 },
      cpu: { usage: 35.2, load: [0.5, 0.8, 1.2] },
      database: { connections: 15, queries: 1234 },
      cache: { hitRate: 87.5, operations: 5678 },
      errors: { rate: 0.2, count: 12 },
      activeUsers: 142
    })
  });
};

if (typeof window !== 'undefined') {
  (window as any).fetch = mockMetricsFetch;
}

const meta: Meta<typeof MetricsCard> = {
  title: 'Admin/MetricsCard',
  component: MetricsCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
# MetricsCard

Real-time system metrics component with charts and KPIs. Automatically polls the backend
for updated metrics and displays them in an intuitive dashboard format.

## Features

- Real-time data polling (configurable interval)
- Multiple chart types (line, bar, pie charts)
- Animated number tickers for KPIs
- Responsive grid layout
- Error handling with retry capability
        `
      }
    }
  },
  argTypes: {
    pollInterval: {
      control: { type: 'number', min: 1000, max: 30000, step: 1000 },
      description: 'Polling interval in milliseconds',
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
    pollInterval: 5000,
    className: 'max-w-6xl'
  }
};

export const FastPolling: Story = {
  args: {
    pollInterval: 2000,
    className: 'max-w-6xl'
  },
  parameters: {
    docs: {
      description: {
        story: 'MetricsCard with faster polling for real-time monitoring.'
      }
    }
  }
};

export const SlowPolling: Story = {
  args: {
    pollInterval: 15000,
    className: 'max-w-6xl'
  },
  parameters: {
    docs: {
      description: {
        story: 'MetricsCard with slower polling to reduce server load.'
      }
    }
  }
};
