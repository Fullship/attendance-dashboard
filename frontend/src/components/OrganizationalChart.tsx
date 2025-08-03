import React, { useState, useEffect } from 'react';
import { adminAPI } from '../utils/api';
import { MagicCard, ShimmerButton, NumberTicker, GradientText, FadeInStagger } from './ui';
import { Employee, Location, Team } from '../types';
import LoadingSpinner from './LoadingSpinner';

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

interface OrganizationalChartProps {
  onEmployeeSelect?: (employee: OrganizationalNode) => void;
}

const OrganizationalChart: React.FC<OrganizationalChartProps> = ({ onEmployeeSelect }) => {
  const [organizationData, setOrganizationData] = useState<OrganizationalNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<'hierarchy' | 'flat' | 'teams'>('hierarchy');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());

  const fetchOrganizationalData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch employees, teams, and locations data
      const [employeesResponse, teamsResponse, locationsResponse] = await Promise.all([
        adminAPI.getEmployees({ page: 1, limit: 1000 }),
        adminAPI.getTeams(),
        adminAPI.getLocations(),
      ]);

      const employees = employeesResponse.employees;
      const teams = teamsResponse.teams;
      const locations = locationsResponse.locations;

      // Build organizational hierarchy
      const hierarchy = buildOrganizationalHierarchy(employees, teams, locations);
      setOrganizationData(hierarchy);

      // Auto-expand root level nodes and their first level children
      const rootNodes = hierarchy.filter(node => !node.managerId);
      const firstLevelIds = new Set<number>();
      rootNodes.forEach(root => {
        firstLevelIds.add(root.id);
        root.directReports.forEach(child => {
          firstLevelIds.add(child.id);
        });
      });
      setExpandedNodes(firstLevelIds);
    } catch (err: any) {
      setError('Failed to load organizational data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const buildOrganizationalHierarchy = (
    employees: Employee[],
    teams: Team[],
    locations: Location[]
  ): OrganizationalNode[] => {
    // Create lookup maps
    const teamMap = new Map(teams.map(team => [team.id, team]));
    const locationMap = new Map(locations.map(location => [location.id, location]));

    // Convert employees to organizational nodes
    const nodeMap = new Map<number, OrganizationalNode>();
    const rootNodes: OrganizationalNode[] = [];

    employees.forEach(employee => {
      const team = employee.teamId ? teamMap.get(employee.teamId) : undefined;
      const location = employee.locationId ? locationMap.get(employee.locationId) : undefined;

      const node: OrganizationalNode = {
        id: employee.id,
        name: `${employee.firstName} ${employee.lastName}`,
        email: employee.email,
        role: determineRole(employee, team),
        location,
        team,
        directReports: [],
        isManager: false,
        // Simplified hierarchy: use team manager relationships if available
        managerId: team?.managerId && team.managerId !== employee.id ? team.managerId : undefined,
        avatar: generateAvatar(employee.firstName, employee.lastName),
      };

      nodeMap.set(employee.id, node);
    });

    // Build hierarchy by connecting managers and direct reports
    nodeMap.forEach(node => {
      if (node.managerId && nodeMap.has(node.managerId)) {
        const manager = nodeMap.get(node.managerId)!;
        manager.directReports.push(node);
        manager.isManager = true;
      } else {
        // No manager or manager not found means this is a root node
        rootNodes.push(node);
      }
    });

    // Ensure we don't lose any employees - if rootNodes is empty or missing employees,
    // add all employees as individual root nodes
    const allEmployeeIds = new Set(employees.map(emp => emp.id));
    const displayedEmployeeIds = new Set<number>();

    // Collect all displayed employee IDs from the hierarchy
    const collectDisplayedIds = (nodes: OrganizationalNode[]) => {
      nodes.forEach(node => {
        displayedEmployeeIds.add(node.id);
        collectDisplayedIds(node.directReports);
      });
    };

    collectDisplayedIds(rootNodes);

    // Add any missing employees as root nodes
    employees.forEach(employee => {
      if (!displayedEmployeeIds.has(employee.id)) {
        const missingNode = nodeMap.get(employee.id);
        if (missingNode) {
          // Clear any invalid manager reference
          missingNode.managerId = undefined;
          rootNodes.push(missingNode);
        }
      }
    });

    return rootNodes;
  };

  const determineRole = (employee: Employee, team?: Team): string => {
    if (employee.isAdmin) return 'Administrator';
    if (team?.managerId === employee.id) return `${team.name} Manager`;
    if (team) return `${team.name} Team Member`;
    return 'Employee';
  };

  const generateAvatar = (firstName: string, lastName: string): string => {
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-red-500',
      'bg-yellow-500',
      'bg-indigo-500',
      'bg-pink-500',
      'bg-teal-500',
    ];
    const colorIndex = (firstName.charCodeAt(0) + lastName.charCodeAt(0)) % colors.length;
    return `${colors[colorIndex]} text-white font-semibold flex items-center justify-center rounded-full w-12 h-12 text-sm`;
  };

  const toggleNodeExpansion = (nodeId: number) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const filterNodes = (nodes: OrganizationalNode[], searchTerm: string): OrganizationalNode[] => {
    if (!searchTerm.trim()) return nodes;

    return nodes
      .filter(node => {
        const matchesSearch =
          node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          node.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          node.role.toLowerCase().includes(searchTerm.toLowerCase());

        const hasMatchingChild = node.directReports.some(
          child => filterNodes([child], searchTerm).length > 0
        );

        return matchesSearch || hasMatchingChild;
      })
      .map(node => ({
        ...node,
        directReports: filterNodes(node.directReports, searchTerm),
      }));
  };

  // Helper function to get all employees recursively
  const getAllEmployees = (nodes: OrganizationalNode[]): OrganizationalNode[] => {
    const allEmployees: OrganizationalNode[] = [];
    nodes.forEach(node => {
      allEmployees.push(node);
      allEmployees.push(...getAllEmployees(node.directReports));
    });
    return allEmployees;
  };

  // Helper function to get all node IDs recursively
  const getAllNodeIds = (nodes: OrganizationalNode[]): number[] => {
    const ids: number[] = [];
    nodes.forEach(node => {
      ids.push(node.id);
      ids.push(...getAllNodeIds(node.directReports));
    });
    return ids;
  };

  // Expand all nodes
  const expandAll = () => {
    const allIds = getAllNodeIds(organizationData);
    setExpandedNodes(new Set(allIds));
  };

  // Collapse all nodes (keep only root level expanded)
  const collapseAll = () => {
    const rootNodes = organizationData.filter(node => !node.managerId);
    setExpandedNodes(new Set(rootNodes.map(node => node.id)));
  };

  const renderEmployeeCard = (
    node: OrganizationalNode,
    level: number = 0,
    isLast: boolean = false,
    parentPath: boolean[] = []
  ) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasDirectReports = node.directReports.length > 0;
    const filteredReports = filterNodes(node.directReports, searchTerm);

    return (
      <div key={node.id} className="flex flex-col items-center">
        {/* Employee Card */}
        <div className="relative">
          <MagicCard
            gradientColor={node.isManager ? '#8b5cf6' : '#3b82f6'}
            className="cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl w-full max-w-sm min-w-[320px] sm:w-80 border border-white/20 backdrop-blur-sm"
          >
            <div
              className="p-4 sm:p-6 relative overflow-hidden"
              onClick={() => onEmployeeSelect?.(node)}
            >
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-2 right-2 w-16 h-16 bg-white rounded-full blur-xl"></div>
                <div className="absolute bottom-2 left-2 w-12 h-12 bg-white rounded-full blur-lg"></div>
              </div>

              {/* Content */}
              <div className="relative z-10">
                {/* Header Section */}
                <div className="flex items-center space-x-3 mb-4">
                  {/* Avatar */}
                  <div
                    className={`${node.avatar} w-12 h-12 sm:w-14 sm:h-14 text-sm sm:text-lg shadow-lg ring-2 ring-white/30 flex-shrink-0`}
                  >
                    {node.name
                      .split(' ')
                      .map(n => n[0])
                      .join('')}
                  </div>

                  {/* Name and Team Lead Badge */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-bold text-white leading-tight break-words">
                      {node.name}
                    </h3>

                    {/* Team Lead Badge - positioned under name */}
                    {node.isManager && (
                      <div className="mt-1 mb-2">
                        <span className="px-2 py-1 sm:px-3 text-xs font-bold bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 rounded-full shadow-md whitespace-nowrap">
                          👑 Team Lead
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact Info and Tags Section */}
                <div className="mb-4 space-y-3">
                  {/* Email */}
                  <div className="text-xs sm:text-sm text-white/80 bg-white/10 rounded-lg px-3 py-2 backdrop-blur-sm border border-white/20 break-all">
                    📧 {node.email}
                  </div>

                  {/* Location and Team Tags - side by side */}
                  <div className="flex flex-wrap gap-2">
                    {node.location && (
                      <span className="inline-flex items-center px-2 py-1 sm:px-3 text-xs font-medium bg-white/20 text-white rounded-full border border-white/30 backdrop-blur-sm break-words flex-1 min-w-0">
                        <span className="mr-1 flex-shrink-0">📍</span>
                        <span className="truncate">{node.location.name}</span>
                      </span>
                    )}
                    {node.team && (
                      <span className="inline-flex items-center px-2 py-1 sm:px-3 text-xs font-medium bg-white/20 text-white rounded-full border border-white/30 backdrop-blur-sm break-words flex-1 min-w-0">
                        <span className="mr-1 flex-shrink-0">👥</span>
                        <span className="truncate">{node.team.name}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Direct Reports Section */}
                {hasDirectReports && (
                  <div className="border-t border-white/30 pt-4 mt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-bold text-white">Direct Reports</span>
                        <div className="bg-gradient-to-r from-white/20 to-white/30 text-white text-sm font-bold px-3 py-1 rounded-full border border-white/40 shadow-sm">
                          <NumberTicker value={node.directReports.length} />
                        </div>
                      </div>

                      {/* Expand/Collapse Button */}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          toggleNodeExpansion(node.id);
                        }}
                        className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-all duration-200 group border border-white/30 shadow-sm"
                      >
                        <svg
                          className={`w-5 h-5 text-white transition-transform duration-300 group-hover:scale-110 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </MagicCard>
        </div>

        {/* Vertical Connection Line to Children */}
        {hasDirectReports && isExpanded && filteredReports.length > 0 && (
          <div className="flex flex-col items-center">
            {/* Main vertical line down from parent */}
            <div className="w-1 h-8 sm:h-12 bg-gradient-to-b from-blue-500 via-purple-500 to-blue-500 rounded-full shadow-lg"></div>

            {/* Connection structure for multiple children */}
            {filteredReports.length > 1 ? (
              <div className="relative flex justify-center w-full">
                {/* Calculate spacing based on actual card width (400px per card to prevent overlap) */}
                <div
                  className="flex justify-between items-center relative"
                  style={{
                    width: `${Math.min(filteredReports.length * 400, 1200)}px`,
                    maxWidth: '95vw',
                  }}
                >
                  {/* Horizontal connecting line - spans between first and last connection points */}
                  <div
                    className="absolute top-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 rounded-full shadow-lg"
                    style={{
                      left: '200px', // Half of card space (400px / 2)
                      right: '200px', // Half of card space (400px / 2)
                      width: `calc(100% - 400px)`, // Full width minus padding on both sides
                    }}
                  ></div>

                  {/* Vertical drops to each child - positioned at card centers */}
                  {filteredReports.map((_, index) => (
                    <div
                      key={index}
                      className="w-1 h-8 sm:h-12 bg-gradient-to-b from-blue-500 via-purple-500 to-blue-500 rounded-full shadow-lg absolute"
                      style={{
                        left: `${index * 400 + 200}px`, // Center of each 400px slot
                        transform: 'translateX(-50%)', // Center the line itself
                      }}
                    ></div>
                  ))}
                </div>
              </div>
            ) : (
              /* Single child - direct vertical line */
              <div className="w-1 h-8 sm:h-12 bg-gradient-to-b from-blue-500 via-purple-500 to-blue-500 rounded-full shadow-lg"></div>
            )}
          </div>
        )}

        {/* Direct Reports Grid */}
        {hasDirectReports && isExpanded && (
          <div className="mt-4">
            {filteredReports.length > 1 ? (
              /* Multiple children - distributed layout with proper spacing */
              <div
                className="flex justify-center items-start"
                style={{
                  width: `${Math.min(filteredReports.length * 400, 1200)}px`,
                  maxWidth: '95vw',
                  margin: '0 auto',
                }}
              >
                <div className="flex justify-between w-full">
                  {filteredReports.map((report, index) => (
                    <div key={report.id} className="flex justify-center" style={{ width: '400px' }}>
                      {renderEmployeeCard(report, level + 1, index === filteredReports.length - 1, [
                        ...parentPath,
                        !isLast,
                      ])}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Single child - centered */
              <FadeInStagger className="flex justify-center" staggerDelay={0.1}>
                {filteredReports.map((report, index) => (
                  <div key={report.id} className="flex-shrink-0">
                    {renderEmployeeCard(report, level + 1, index === filteredReports.length - 1, [
                      ...parentPath,
                      !isLast,
                    ])}
                  </div>
                ))}
              </FadeInStagger>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderTeamsView = () => {
    const teamGroups = new Map<string, OrganizationalNode[]>();

    const allNodes = getAllEmployees(organizationData);

    allNodes.forEach(node => {
      const teamName = node.team?.name || 'Unassigned';
      if (!teamGroups.has(teamName)) {
        teamGroups.set(teamName, []);
      }
      teamGroups.get(teamName)!.push(node);
    });

    return (
      <FadeInStagger className="space-y-6" staggerDelay={0.1}>
        {Array.from(teamGroups.entries()).map(([teamName, members]) => (
          <MagicCard key={teamName} gradientColor="#10b981">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <GradientText
                  className="text-xl font-bold"
                  colors={['#10b981', '#059669', '#047857']}
                >
                  {teamName}
                </GradientText>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  <NumberTicker value={members.length} />
                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">members</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {members.map(member => (
                  <div
                    key={member.id}
                    className="p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 transition-colors cursor-pointer"
                    onClick={() => onEmployeeSelect?.(member)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`${member.avatar} flex-shrink-0`}>
                        {member.name
                          .split(' ')
                          .map(n => n[0])
                          .join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white break-words leading-tight">
                          {member.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 break-words mt-1">
                          {member.role}
                        </p>
                        {member.isManager && (
                          <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 rounded-full whitespace-nowrap">
                            Team Lead
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </MagicCard>
        ))}
      </FadeInStagger>
    );
  };

  useEffect(() => {
    fetchOrganizationalData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <MagicCard gradientColor="#ef4444" className="border-red-200 dark:border-red-800">
        <div className="p-6 text-red-700 dark:text-red-300">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </div>
        </div>
      </MagicCard>
    );
  }

  const filteredData = filterNodes(organizationData, searchTerm);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <GradientText
          className="text-3xl font-bold mb-2"
          colors={['#8b5cf6', '#3b82f6', '#10b981']}
        >
          Organizational Chart
        </GradientText>
        <p className="text-gray-600 dark:text-gray-400">
          Explore your company's organizational structure and reporting relationships
        </p>
      </div>

      {/* Controls */}
      <FadeInStagger className="space-y-4" staggerDelay={0.1}>
        {/* View Toggle */}
        <MagicCard gradientColor="#3b82f6">
          <div className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* View Selection */}
              <div className="flex space-x-2">
                {[
                  { key: 'hierarchy', label: 'Hierarchy', icon: '🏢' },
                  { key: 'teams', label: 'Teams', icon: '👥' },
                  { key: 'flat', label: 'All Employees', icon: '📋' },
                ].map(view => (
                  <ShimmerButton
                    key={view.key}
                    onClick={() => setSelectedView(view.key as any)}
                    background={
                      selectedView === view.key
                        ? 'linear-gradient(45deg, #8b5cf6, #7c3aed)'
                        : 'linear-gradient(45deg, #6b7280, #4b5563)'
                    }
                    className="text-sm px-4 py-2"
                  >
                    {view.icon} {view.label}
                  </ShimmerButton>
                ))}
              </div>

              {/* Hierarchy Controls */}
              {selectedView === 'hierarchy' && (
                <div className="flex space-x-2">
                  <ShimmerButton
                    onClick={expandAll}
                    background="linear-gradient(45deg, #10b981, #059669)"
                    className="text-sm px-3 py-2"
                  >
                    🌳 Expand All
                  </ShimmerButton>
                  <ShimmerButton
                    onClick={collapseAll}
                    background="linear-gradient(45deg, #f59e0b, #d97706)"
                    className="text-sm px-3 py-2"
                  >
                    📁 Collapse All
                  </ShimmerButton>
                </div>
              )}

              {/* Search */}
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search employees, teams, or roles..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>
        </MagicCard>

        {/* Statistics */}
        <FadeInStagger className="grid grid-cols-1 md:grid-cols-4 gap-4" staggerDelay={0.1}>
          <MagicCard gradientColor="#3b82f6" className="p-0">
            <div className="text-center p-4">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                <NumberTicker value={getAllEmployees(organizationData).length} />
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Employees</div>
            </div>
          </MagicCard>

          <MagicCard gradientColor="#8b5cf6" className="p-0">
            <div className="text-center p-4">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                <NumberTicker
                  value={getAllEmployees(organizationData).filter(emp => emp.isManager).length}
                />
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Team Leads</div>
            </div>
          </MagicCard>

          <MagicCard gradientColor="#10b981" className="p-0">
            <div className="text-center p-4">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                <NumberTicker
                  value={
                    new Set(
                      getAllEmployees(organizationData)
                        .map(emp => emp.team?.name)
                        .filter(Boolean)
                    ).size
                  }
                />
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Teams</div>
            </div>
          </MagicCard>

          <MagicCard gradientColor="#f59e0b" className="p-0">
            <div className="text-center p-4">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                <NumberTicker
                  value={
                    new Set(
                      getAllEmployees(organizationData)
                        .map(emp => emp.location?.name)
                        .filter(Boolean)
                    ).size
                  }
                />
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Locations</div>
            </div>
          </MagicCard>
        </FadeInStagger>
      </FadeInStagger>

      {/* Content */}
      <div className="mt-8">
        {selectedView === 'hierarchy' && (
          <div className="flex flex-col items-center space-y-8 sm:space-y-12 overflow-x-auto pb-8">
            <FadeInStagger
              className="flex flex-col items-center space-y-8 sm:space-y-12"
              staggerDelay={0.2}
            >
              {filteredData.map((node, index) => (
                <div key={node.id} className="flex flex-col items-center">
                  {renderEmployeeCard(node, 0, index === filteredData.length - 1, [])}
                </div>
              ))}
            </FadeInStagger>
          </div>
        )}

        {selectedView === 'teams' && renderTeamsView()}

        {selectedView === 'flat' && (
          <FadeInStagger
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            staggerDelay={0.05}
          >
            {getAllEmployees(organizationData)
              .filter(
                node =>
                  !searchTerm.trim() ||
                  node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  node.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  node.role.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(node => (
                <MagicCard
                  key={node.id}
                  gradientColor={node.isManager ? '#8b5cf6' : '#3b82f6'}
                  className="cursor-pointer w-full"
                >
                  <div className="p-4" onClick={() => onEmployeeSelect?.(node)}>
                    <div className="flex items-center space-x-3">
                      <div className={`${node.avatar} flex-shrink-0`}>
                        {node.name
                          .split(' ')
                          .map(n => n[0])
                          .join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-white break-words leading-tight">
                          {node.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-words mt-1">
                          {node.role}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 break-all mt-1">
                          {node.email}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {node.isManager && (
                            <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 rounded-full whitespace-nowrap">
                              Team Lead
                            </span>
                          )}
                          {node.location && (
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full flex items-center max-w-full">
                              <span className="mr-1">📍</span>
                              <span className="truncate">{node.location.name}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </MagicCard>
              ))}
          </FadeInStagger>
        )}
      </div>
    </div>
  );
};

export default OrganizationalChart;
