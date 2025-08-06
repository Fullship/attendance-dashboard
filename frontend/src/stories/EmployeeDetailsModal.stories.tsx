import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-webpack5';
import EmployeeDetailsModal from '../components/EmployeeDetailsModal';

// Mock employee data
const mockEmployee = {
  id: 1,
  name: 'John Doe',
  email: 'john.doe@company.com',
  role: 'Engineering Manager',
  location: {
    id: 1,
    name: 'New York Office',
    timezone: 'America/New_York',
    address: '123 Tech Street, New York, NY 10001',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  team: {
    id: 1,
    name: 'Engineering',
    managerId: undefined,
    locationId: 1,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  directReports: [
    {
      id: 2,
      name: 'Jane Smith',
      email: 'jane.smith@company.com',
      role: 'Senior Software Engineer',
      isManager: false,
      managerId: 1,
      avatar: 'bg-blue-500 text-white font-semibold flex items-center justify-center rounded-full w-12 h-12 text-sm',
      directReports: [],
      location: {
        id: 1,
        name: 'New York Office',
        timezone: 'America/New_York',
        address: '123 Tech Street, New York, NY 10001',
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      team: {
        id: 1,
        name: 'Engineering',
        managerId: 1,
        locationId: 1,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    },
    {
      id: 3,
      name: 'Bob Johnson',
      email: 'bob.johnson@company.com',
      role: 'Frontend Developer',
      isManager: false,
      managerId: 1,
      avatar: 'bg-green-500 text-white font-semibold flex items-center justify-center rounded-full w-12 h-12 text-sm',
      directReports: [],
      location: {
        id: 1,
        name: 'New York Office',
        timezone: 'America/New_York',
        address: '123 Tech Street, New York, NY 10001',
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      team: {
        id: 1,
        name: 'Engineering',
        managerId: 1,
        locationId: 1,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    },
    {
      id: 4,
      name: 'Alice Wilson',
      email: 'alice.wilson@company.com',
      role: 'Backend Developer',
      isManager: false,
      managerId: 1,
      avatar: 'bg-purple-500 text-white font-semibold flex items-center justify-center rounded-full w-12 h-12 text-sm',
      directReports: [],
      location: {
        id: 1,
        name: 'New York Office',
        timezone: 'America/New_York',
        address: '123 Tech Street, New York, NY 10001',
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      team: {
        id: 1,
        name: 'Engineering',
        managerId: 1,
        locationId: 1,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    }
  ],
  isManager: true,
  managerId: undefined,
  avatar: 'bg-indigo-500 text-white font-semibold flex items-center justify-center rounded-full w-12 h-12 text-sm'
};

const mockRegularEmployee = {
  id: 2,
  name: 'Jane Smith',
  email: 'jane.smith@company.com',
  role: 'Senior Software Engineer',
  location: {
    id: 1,
    name: 'New York Office',
    timezone: 'America/New_York',
    address: '123 Tech Street, New York, NY 10001',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  team: {
    id: 1,
    name: 'Engineering',
    managerId: 1,
    locationId: 1,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  directReports: [],
  isManager: false,
  managerId: 1,
  avatar: 'bg-blue-500 text-white font-semibold flex items-center justify-center rounded-full w-12 h-12 text-sm'
};

// Mock API
jest.mock('../utils/api', () => ({
  adminAPI: {
    getEmployeeById: async (id: number) => {
      const employee = {
        id,
        firstName: mockEmployee.name.split(' ')[0],
        lastName: mockEmployee.name.split(' ')[1],
        email: mockEmployee.email,
        isAdmin: id === 1,
        createdAt: '2023-01-01',
        phoneNumber: '+1 (555) 123-4567',
        isActive: true,
        joinDate: '2023-01-01',
        lastLogin: '2025-01-09',
        stats: {
          totalRecords: 30,
          presentDays: 28,
          absentDays: 2,
          lateDays: 3,
          averageHours: '8.2'
        }
      };
      return Promise.resolve({ employee });
    }
  }
}));

const meta: Meta<typeof EmployeeDetailsModal> = {
  title: 'Components/EmployeeDetailsModal',
  component: EmployeeDetailsModal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'A comprehensive modal for displaying detailed employee information including personal details, organizational relationships, and attendance statistics.'
      }
    }
  },
  argTypes: {
    isOpen: {
      control: 'boolean',
      description: 'Controls whether the modal is visible'
    },
    onClose: {
      action: 'modal-closed',
      description: 'Callback function called when the modal is closed'
    },
    employee: {
      description: 'Employee data object containing all relevant information'
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

export const ManagerProfile: Story = {
  args: {
    isOpen: true,
    employee: mockEmployee,
    onClose: () => console.log('Modal closed')
  },
  parameters: {
    docs: {
      description: {
        story: 'Employee details modal showing a manager with direct reports, including all sections like attendance stats and organizational relationships.'
      }
    }
  }
};

export const RegularEmployee: Story = {
  args: {
    isOpen: true,
    employee: mockRegularEmployee,
    onClose: () => console.log('Modal closed')
  },
  parameters: {
    docs: {
      description: {
        story: 'Employee details modal for a regular employee without direct reports, showing manager information instead.'
      }
    }
  }
};

export const Closed: Story = {
  args: {
    isOpen: false,
    employee: mockEmployee,
    onClose: () => console.log('Modal closed')
  },
  parameters: {
    docs: {
      description: {
        story: 'The modal in its closed state (not visible).'
      }
    }
  }
};

export const NoEmployee: Story = {
  args: {
    isOpen: true,
    employee: null,
    onClose: () => console.log('Modal closed')
  },
  parameters: {
    docs: {
      description: {
        story: 'Modal state when no employee data is provided.'
      }
    }
  }
};

export const LoadingState: Story = {
  args: {
    isOpen: true,
    employee: mockEmployee,
    onClose: () => console.log('Modal closed')
  },
  parameters: {
    docs: {
      description: {
        story: 'Modal showing loading state while fetching employee details.'
      }
    }
  },
  decorators: [
    (Story) => {
      // Mock loading API
      jest.doMock('../utils/api', () => ({
        adminAPI: {
          getEmployeeById: () => new Promise(() => {}) // Never resolves
        }
      }));
      return <Story />;
    }
  ]
};

export const DarkMode: Story = {
  args: {
    isOpen: true,
    employee: mockEmployee,
    onClose: () => console.log('Modal closed')
  },
  parameters: {
    docs: {
      description: {
        story: 'Employee details modal in dark mode theme.'
      }
    }
  },
  decorators: [
    (Story) => (
      <div className="dark">
        <Story />
      </div>
    )
  ]
};

export const InteractiveDemo: Story = {
  args: {
    isOpen: true,
    employee: mockEmployee
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive demo showing the modal with realistic data and animations.'
      }
    }
  },
  render: (args) => {
    const [isOpen, setIsOpen] = React.useState(args.isOpen);
    
    return (
      <div>
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Open Employee Details
        </button>
        
        <EmployeeDetailsModal
          {...args}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        />
      </div>
    );
  }
};
