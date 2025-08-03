import type { Meta, StoryObj } from '@storybook/react';
import { BrowserRouter } from 'react-router-dom';
import OrganizationalChart from '../components/OrganizationalChart';

// Mock data for the organizational chart
const mockEmployees = [
  {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@company.com',
    isAdmin: true,
    locationId: 1,
    teamId: 1,
    createdAt: '2023-01-01',
    stats: {
      totalRecords: 30,
      presentDays: 28,
      absentDays: 2,
      lateDays: 3,
      averageHours: '8.2'
    },
    location: { id: 1, name: 'New York', timezone: 'America/New_York', address: '123 Main St' },
    team: { id: 1, name: 'Engineering', managerId: null, locationId: 1 }
  },
  {
    id: 2,
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@company.com',
    isAdmin: false,
    locationId: 1,
    teamId: 1,
    createdAt: '2023-01-15',
    stats: {
      totalRecords: 30,
      presentDays: 29,
      absentDays: 1,
      lateDays: 1,
      averageHours: '8.5'
    },
    location: { id: 1, name: 'New York', timezone: 'America/New_York', address: '123 Main St' },
    team: { id: 1, name: 'Engineering', managerId: 1, locationId: 1 }
  },
  {
    id: 3,
    firstName: 'Bob',
    lastName: 'Johnson',
    email: 'bob.johnson@company.com',
    isAdmin: false,
    locationId: 2,
    teamId: 2,
    createdAt: '2023-02-01',
    stats: {
      totalRecords: 30,
      presentDays: 27,
      absentDays: 3,
      lateDays: 2,
      averageHours: '7.8'
    },
    location: { id: 2, name: 'San Francisco', timezone: 'America/Los_Angeles', address: '456 Tech St' },
    team: { id: 2, name: 'Design', managerId: 1, locationId: 2 }
  }
];

const mockTeams = [
  { id: 1, name: 'Engineering', managerId: 1, locationId: 1 },
  { id: 2, name: 'Design', managerId: 1, locationId: 2 }
];

const mockLocations = [
  { id: 1, name: 'New York', timezone: 'America/New_York', address: '123 Main St' },
  { id: 2, name: 'San Francisco', timezone: 'America/Los_Angeles', address: '456 Tech St' }
];

// Mock API
const mockAdminAPI = {
  getEmployees: async () => Promise.resolve({ employees: mockEmployees }),
  getTeams: async () => Promise.resolve({ teams: mockTeams }),
  getLocations: async () => Promise.resolve({ locations: mockLocations }),
  getEmployeeById: async (id: number) => {
    const employee = mockEmployees.find(emp => emp.id === id);
    return Promise.resolve({ employee });
  }
};

// Replace the actual API with our mock
jest.mock('../utils/api', () => ({
  adminAPI: mockAdminAPI
}));

const meta: Meta<typeof OrganizationalChart> = {
  title: 'Components/OrganizationalChart',
  component: OrganizationalChart,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'An interactive organizational chart showing employee hierarchy and relationships with Magic UI components.'
      }
    }
  },
  decorators: [
    (Story) => (
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
          <Story />
        </div>
      </BrowserRouter>
    )
  ],
  argTypes: {
    onEmployeeSelect: {
      action: 'employee-selected',
      description: 'Callback function called when an employee is selected'
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onEmployeeSelect: (employee) => {
      console.log('Selected employee:', employee);
    }
  },
  parameters: {
    docs: {
      description: {
        story: 'The default organizational chart view showing the company hierarchy with Magic UI styling.'
      }
    }
  }
};

export const WithEmployeeSelection: Story = {
  args: {
    onEmployeeSelect: (employee) => {
      alert(`Selected: ${employee.name} (${employee.role})`);
    }
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive organizational chart where clicking on employees triggers a selection callback.'
      }
    }
  }
};

export const LoadingState: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Shows the loading state while data is being fetched.'
      }
    }
  },
  decorators: [
    (Story) => {
      // Mock loading state
      const mockLoadingAPI = {
        ...mockAdminAPI,
        getEmployees: () => new Promise(() => {}) // Never resolves to show loading
      };
      
      return (
        <BrowserRouter>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <Story />
          </div>
        </BrowserRouter>
      );
    }
  ]
};

export const ErrorState: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Shows the error state when data fails to load.'
      }
    }
  },
  decorators: [
    (Story) => {
      // Mock error state
      const mockErrorAPI = {
        ...mockAdminAPI,
        getEmployees: () => Promise.reject(new Error('Failed to load organizational data'))
      };
      
      return (
        <BrowserRouter>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <Story />
          </div>
        </BrowserRouter>
      );
    }
  ]
};

export const DarkMode: Story = {
  args: {
    onEmployeeSelect: (employee) => {
      console.log('Selected employee:', employee);
    }
  },
  parameters: {
    docs: {
      description: {
        story: 'Organizational chart in dark mode theme.'
      }
    }
  },
  decorators: [
    (Story) => (
      <BrowserRouter>
        <div className="min-h-screen bg-gray-900 p-6 dark">
          <Story />
        </div>
      </BrowserRouter>
    )
  ]
};

export const HierarchyTreeView: Story = {
  args: {
    onEmployeeSelect: (employee) => {
      console.log('Selected employee:', employee);
    }
  },
  parameters: {
    docs: {
      description: {
        story: 'Hierarchy view showcasing the tree-style layout with connecting lines, expand/collapse functionality, and organizational pipeline visualization. This view clearly shows the reporting structure with visual tree connections.'
      }
    }
  },
  decorators: [
    (Story) => (
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                🌳 Tree-Style Hierarchy View
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
                Experience the enhanced organizational chart with tree-style layout, connecting lines, and intuitive expand/collapse controls.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="text-blue-700 dark:text-blue-300 font-semibold mb-2">🔗 Visual Connections</div>
                  <div className="text-blue-600 dark:text-blue-400">Tree lines show clear reporting relationships</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="text-green-700 dark:text-green-300 font-semibold mb-2">🌳 Expand/Collapse</div>
                  <div className="text-green-600 dark:text-green-400">Control visibility of organizational levels</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="text-purple-700 dark:text-purple-300 font-semibold mb-2">✨ Magic UI</div>
                  <div className="text-purple-600 dark:text-purple-400">Enhanced with gradients and animations</div>
                </div>
              </div>
            </div>
            <Story />
          </div>
        </div>
      </BrowserRouter>
    )
  ]
};
