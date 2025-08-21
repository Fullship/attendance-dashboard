# Organizational Structure Feature

## Overview

This feature provides a comprehensive organizational structure visualization for the attendance dashboard, showing employee hierarchy, line manager relationships, and detailed employee information. Built with modern UI patterns using Storybook and Magic UI components for an enhanced frontend experience.

## Features

### 🏢 Organizational Chart
- **Hierarchical View**: Visual representation of company structure with manager-employee relationships
- **Team View**: Group employees by teams with team statistics
- **Flat View**: List all employees in a searchable grid format
- **Interactive Elements**: Click on any employee to view detailed information
- **Search & Filter**: Real-time search across names, emails, and roles
- **Statistics Dashboard**: Live metrics showing total employees, managers, teams, and locations

### 👤 Employee Details Modal
- **Comprehensive Profile**: Full employee information including contact details and role
- **Organizational Relationships**: Shows direct reports and line manager information
- **Attendance Analytics**: 30-day attendance overview with key metrics
- **Visual Elements**: Avatar generation, status indicators, and Magic UI animations
- **Responsive Design**: Optimized for all screen sizes

### ✨ Magic UI Integration
- **MagicCard**: Gradient-bordered cards with animated effects
- **ShimmerButton**: Interactive buttons with shimmer animations
- **NumberTicker**: Animated number counting for statistics
- **GradientText**: Beautiful gradient text headers
- **FadeInStagger**: Smooth staggered animations for lists

### 📖 Storybook Documentation
- **Component Stories**: Interactive documentation for all components
- **Multiple Variants**: Different states and configurations
- **Dark Mode Support**: Stories for both light and dark themes
- **Interactive Examples**: Live demos with controls and actions

## File Structure

```
frontend/src/
├── components/
│   ├── OrganizationalChart.tsx        # Main organizational chart component
│   ├── EmployeeDetailsModal.tsx       # Employee details modal
│   └── Sidebar.tsx                    # Updated with org chart navigation
├── pages/
│   └── AdminDashboard.tsx             # Updated with org chart tab
├── stories/
│   ├── OrganizationalChart.stories.tsx # Storybook stories for org chart
│   └── EmployeeDetailsModal.stories.tsx # Storybook stories for modal
├── types/
│   └── index.ts                       # Updated Employee interface
└── utils/
    └── api.ts                         # Updated with getEmployeeById method
```

## Technical Implementation

### Database Schema
The feature leverages existing database structure:
- `teams.manager_id` - Foreign key linking to users(id) for hierarchy
- `users.team_id` - Links employees to their teams
- `users.location_id` - Links employees to their locations

### API Endpoints
- `GET /admin/employees` - Fetch all employees with team/location data
- `GET /admin/teams` - Fetch team information with manager relationships
- `GET /admin/locations` - Fetch location data
- `GET /admin/employees/:id` - Fetch detailed employee information

### Component Architecture

#### OrganizationalChart Component
```typescript
interface OrganizationalNode {
  id: number;
  name: string;
  email: string;
  role: string;
  location?: Location;
  team?: Team;
  directReports: OrganizationalNode[];
  isManager: boolean;
  managerId?: number;
  avatar?: string;
}
```

#### EmployeeDetailsModal Component
```typescript
interface EmployeeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: OrganizationalNode | null;
}
```

## Usage

### Accessing the Organizational Chart
1. Navigate to the Admin Dashboard
2. Go to Employees > Organizational Chart
3. Choose from three views:
   - **Hierarchy**: Tree structure showing reporting relationships
   - **Teams**: Grouped by team membership
   - **All Employees**: Flat grid view

### Viewing Employee Details
1. Click on any employee card in the organizational chart
2. View comprehensive profile information
3. See reporting relationships and team structure
4. Review attendance statistics and performance metrics

### Using Storybook
1. Run `npm run storybook` in the frontend directory
2. Navigate to Components section
3. Explore OrganizationalChart and EmployeeDetailsModal stories
4. Interact with different states and configurations

## Magic UI Components Used

### MagicCard
- **Purpose**: Container for employee cards and sections
- **Features**: Gradient borders, hover effects, smooth animations
- **Usage**: Employee profiles, statistics cards, team containers

### ShimmerButton
- **Purpose**: Interactive action buttons
- **Features**: Shimmer animation on hover, gradient backgrounds
- **Usage**: View toggles, action buttons, navigation

### NumberTicker
- **Purpose**: Animated statistics display
- **Features**: Smooth counting animation, customizable formatting
- **Usage**: Employee counts, attendance rates, performance metrics

### GradientText
- **Purpose**: Eye-catching headers and titles
- **Features**: Multi-color gradients, smooth transitions
- **Usage**: Section headers, feature titles, emphasis text

### FadeInStagger
- **Purpose**: Smooth list animations
- **Features**: Staggered fade-in effects, customizable delays
- **Usage**: Employee lists, team grids, card collections

## Customization

### Styling
- Tailwind CSS classes for consistent design
- Dark mode support throughout
- Responsive design patterns
- Magic UI component theming

### Data Sources
- Configurable API endpoints
- Mock data support for development
- Error handling and loading states
- Real-time data updates

### Behavior
- Customizable search and filtering
- Configurable view options
- Interactive callbacks
- Accessibility features

## Development

### Adding New Features
1. Update component interfaces in `types/index.ts`
2. Implement UI changes in component files
3. Add API methods in `utils/api.ts`
4. Create Storybook stories for documentation
5. Update backend routes if needed

### Testing
- Unit tests for component logic
- Storybook visual testing
- Integration tests for API calls
- Accessibility testing

### Performance
- Optimized rendering for large datasets
- Lazy loading for employee details
- Efficient search and filtering
- Minimal re-renders

## Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Responsive design for mobile devices
- Touch-friendly interactions
- Accessibility compliance

## Future Enhancements
- Export functionality for org charts
- Advanced filtering options
- Performance analytics integration
- Team collaboration features
- Custom role definitions
- Integration with HR systems

---

*Built with React, TypeScript, Tailwind CSS, Magic UI, and Storybook for a modern, interactive organizational management experience.*
