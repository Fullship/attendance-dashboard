import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  Panel,
  MarkerType,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { adminAPI } from '../utils/api';
import { Employee, Team, Location } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface EmployeeNodeData {
  employee: Employee & { team?: Team; location?: Location };
  isTeamLead: boolean;
  subordinateCount: number;
  level: number;
  teamName?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: (employeeId: number) => void;
}

// Helper function to get team-specific icon based on team name
const getTeamIcon = (teamName?: string) => {
  if (!teamName) return '📁';

  const name = teamName.toLowerCase();

  // Engineering & Development teams
  if (
    name.includes('engineering') ||
    name.includes('development') ||
    name.includes('dev') ||
    name.includes('tech') ||
    name.includes('software')
  ) {
    return '⚙️';
  }
  if (name.includes('frontend') || name.includes('ui') || name.includes('ux')) {
    return '🎨';
  }
  if (name.includes('backend') || name.includes('api') || name.includes('server')) {
    return '🔧';
  }
  if (name.includes('mobile') || name.includes('ios') || name.includes('android')) {
    return '📱';
  }
  if (name.includes('devops') || name.includes('infrastructure') || name.includes('cloud')) {
    return '☁️';
  }
  if (name.includes('data') || name.includes('analytics') || name.includes('science')) {
    return '📊';
  }
  if (name.includes('security') || name.includes('cyber')) {
    return '🔒';
  }
  if (name.includes('qa') || name.includes('quality') || name.includes('test')) {
    return '🧪';
  }

  // Business teams
  if (name.includes('sales') || name.includes('business development') || name.includes('revenue')) {
    return '💼';
  }
  if (name.includes('marketing') || name.includes('growth') || name.includes('brand')) {
    return '📈';
  }
  if (name.includes('finance') || name.includes('accounting') || name.includes('budget')) {
    return '💰';
  }
  if (
    name.includes('hr') ||
    name.includes('human resources') ||
    name.includes('people') ||
    name.includes('talent')
  ) {
    return '👥';
  }
  if (name.includes('legal') || name.includes('compliance')) {
    return '⚖️';
  }
  if (name.includes('operations') || name.includes('ops') || name.includes('admin')) {
    return '🏢';
  }
  if (name.includes('customer') || name.includes('support') || name.includes('service')) {
    return '🎧';
  }
  if (name.includes('product') || name.includes('design')) {
    return '🚀';
  }
  if (name.includes('research') || name.includes('innovation')) {
    return '🔬';
  }

  // Specialized teams
  if (name.includes('consulting') || name.includes('advisory')) {
    return '💡';
  }
  if (name.includes('project') || name.includes('program') || name.includes('management')) {
    return '📋';
  }
  if (name.includes('training') || name.includes('education') || name.includes('learning')) {
    return '📚';
  }
  if (name.includes('creative') || name.includes('content') || name.includes('media')) {
    return '🎭';
  }
  if (name.includes('strategy') || name.includes('planning')) {
    return '🎯';
  }

  // Default fallback based on first letter if no keyword match
  const firstLetter = name.charAt(0);
  const letterIcons: { [key: string]: string } = {
    a: '🅰️',
    b: '🅱️',
    c: '🔵',
    d: '💎',
    e: '🟢',
    f: '🔥',
    g: '🟢',
    h: '🏠',
    i: 'ℹ️',
    j: '🎪',
    k: '🗝️',
    l: '🌟',
    m: '🎯',
    n: '🆕',
    o: '🔵',
    p: '🟣',
    q: '❓',
    r: '🔴',
    s: '⭐',
    t: '🏆',
    u: '🔺',
    v: '✅',
    w: '🌐',
    x: '❌',
    y: '💛',
    z: '⚡',
  };

  return letterIcons[firstLetter] || '📁';
};

// Enhanced Employee Node Component with modern design and dark mode support
const EmployeeNode = ({ data, selected }: { data: EmployeeNodeData; selected?: boolean }) => {
  const { employee, isTeamLead, subordinateCount, teamName, isCollapsed, onToggleCollapse } = data;

  // Get team-specific glow colors for hover effects
  const getTeamGlowColor = () => {
    if (!employee.teamId) {
      return {
        shadow: 'rgba(107, 114, 128, 0.4)', // gray
        glow: 'rgba(107, 114, 128, 0.3)',
      };
    }

    const glowColors = [
      { shadow: 'rgba(59, 130, 246, 0.4)', glow: 'rgba(59, 130, 246, 0.3)' }, // blue
      { shadow: 'rgba(34, 197, 94, 0.4)', glow: 'rgba(34, 197, 94, 0.3)' }, // emerald
      { shadow: 'rgba(249, 115, 22, 0.4)', glow: 'rgba(249, 115, 22, 0.3)' }, // orange
      { shadow: 'rgba(236, 72, 153, 0.4)', glow: 'rgba(236, 72, 153, 0.3)' }, // pink
      { shadow: 'rgba(99, 102, 241, 0.4)', glow: 'rgba(99, 102, 241, 0.3)' }, // indigo
      { shadow: 'rgba(20, 184, 166, 0.4)', glow: 'rgba(20, 184, 166, 0.3)' }, // teal
      { shadow: 'rgba(147, 51, 234, 0.4)', glow: 'rgba(147, 51, 234, 0.3)' }, // purple
      { shadow: 'rgba(239, 68, 68, 0.4)', glow: 'rgba(239, 68, 68, 0.3)' }, // red
    ];

    const colorIndex = employee.teamId % glowColors.length;
    return glowColors[colorIndex];
  };

  // If this is a collapsed team leader, show special collapsed view
  if (isTeamLead && isCollapsed && subordinateCount > 0) {
    const getTeamBorderStyle = () => {
      if (!employee.teamId) {
        return {
          light: 'border-gray-400 bg-gradient-to-br from-gray-50 to-slate-50',
          dark: 'dark:border-gray-300 dark:from-gray-900/20 dark:to-slate-900/20',
        };
      }

      // Generate consistent colors based on team ID
      const teamColors = [
        {
          light: 'border-blue-500 bg-gradient-to-br from-blue-50 to-sky-50',
          dark: 'dark:border-blue-400 dark:from-blue-900/25 dark:to-sky-900/25',
        },
        {
          light: 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-green-50',
          dark: 'dark:border-emerald-400 dark:from-emerald-900/25 dark:to-green-900/25',
        },
        {
          light: 'border-orange-500 bg-gradient-to-br from-orange-50 to-amber-50',
          dark: 'dark:border-orange-400 dark:from-orange-900/25 dark:to-amber-900/25',
        },
        {
          light: 'border-pink-500 bg-gradient-to-br from-pink-50 to-rose-50',
          dark: 'dark:border-pink-400 dark:from-pink-900/25 dark:to-rose-900/25',
        },
        {
          light: 'border-indigo-500 bg-gradient-to-br from-indigo-50 to-blue-50',
          dark: 'dark:border-indigo-400 dark:from-indigo-900/25 dark:to-blue-900/25',
        },
        {
          light: 'border-teal-500 bg-gradient-to-br from-teal-50 to-cyan-50',
          dark: 'dark:border-teal-400 dark:from-teal-900/25 dark:to-cyan-900/25',
        },
        {
          light: 'border-purple-500 bg-gradient-to-br from-purple-50 to-violet-50',
          dark: 'dark:border-purple-400 dark:from-purple-900/25 dark:to-violet-900/25',
        },
        {
          light: 'border-red-500 bg-gradient-to-br from-red-50 to-pink-50',
          dark: 'dark:border-red-400 dark:from-red-900/25 dark:to-pink-900/25',
        },
      ];

      const colorIndex = employee.teamId % teamColors.length;
      return teamColors[colorIndex];
    };

    const teamStyle = getTeamBorderStyle();
    const nodeStyle = `bg-white dark:bg-gray-800 rounded-xl shadow-lg border-4 p-6 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-300/70 dark:hover:shadow-blue-500/40 hover:drop-shadow-xl active:scale-95 ${
      selected
        ? 'ring-4 ring-purple-400 dark:ring-purple-300 ring-opacity-50 scale-105 shadow-2xl shadow-purple-300/60 dark:shadow-purple-500/40'
        : ''
    } ${teamStyle.light} ${teamStyle.dark}`;

    return (
      <>
        <Handle
          type="target"
          position={Position.Top}
          className="w-3 h-3 !bg-purple-500 dark:!bg-purple-400 !border-2 !border-white dark:!border-gray-700"
        />
        <div
          className={`${nodeStyle} min-w-[280px] max-w-[320px] cursor-pointer select-none`}
          style={{ pointerEvents: 'all' }}
          onClick={e => {
            e.stopPropagation();
            onToggleCollapse?.(employee.id);
          }}
          onMouseEnter={e => {
            const glowColor = getTeamGlowColor();
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.transition = 'all 0.2s ease-in-out';
            e.currentTarget.style.boxShadow = `0 25px 50px -12px ${glowColor.shadow}, 0 0 30px ${glowColor.glow}`;
            e.currentTarget.style.filter = `drop-shadow(0 10px 20px ${glowColor.glow})`;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '';
            e.currentTarget.style.filter = '';
          }}
          title="Click to expand team"
        >
          {/* Collapsed Team View */}
          <div className="flex flex-col items-center justify-center text-center py-4">
            <div className="mb-3">
              <span className="text-4xl">{getTeamIcon(teamName)}</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2 leading-tight">
              {teamName || 'Team'}
            </h2>
            <div className="flex items-center justify-center space-x-2 mb-3">
              <div className="inline-flex items-center bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 text-sm font-semibold px-3 py-1 rounded-full">
                <span className="mr-1">👑</span>
                {employee.firstName} {employee.lastName}
              </div>
            </div>
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="inline-flex items-center bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-sm font-semibold px-3 py-2 rounded-full">
                <span className="mr-1">👥</span>
                <span className="font-bold">{subordinateCount}</span>
                <span className="ml-1">members</span>
              </div>
            </div>
            <div className="inline-flex items-center bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 text-sm font-semibold px-4 py-2 rounded-full">
              <span className="mr-2 transition-transform duration-300">📂</span>
              Click to Expand
            </div>
          </div>
        </div>
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-3 h-3 !bg-purple-500 dark:!bg-purple-400 !border-2 !border-white dark:!border-gray-700"
        />
      </>
    );
  }

  // Dynamic team-based border colors
  const getTeamBorderStyle = () => {
    if (!employee.teamId) {
      return {
        light: 'border-gray-400 bg-gradient-to-br from-gray-50 to-slate-50',
        dark: 'dark:border-gray-300 dark:from-gray-900/20 dark:to-slate-900/20',
      };
    }

    // Generate consistent colors based on team ID
    const teamColors = [
      {
        light: 'border-blue-500 bg-gradient-to-br from-blue-50 to-sky-50',
        dark: 'dark:border-blue-400 dark:from-blue-900/25 dark:to-sky-900/25',
      },
      {
        light: 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-green-50',
        dark: 'dark:border-emerald-400 dark:from-emerald-900/25 dark:to-green-900/25',
      },
      {
        light: 'border-orange-500 bg-gradient-to-br from-orange-50 to-amber-50',
        dark: 'dark:border-orange-400 dark:from-orange-900/25 dark:to-amber-900/25',
      },
      {
        light: 'border-pink-500 bg-gradient-to-br from-pink-50 to-rose-50',
        dark: 'dark:border-pink-400 dark:from-pink-900/25 dark:to-rose-900/25',
      },
      {
        light: 'border-indigo-500 bg-gradient-to-br from-indigo-50 to-blue-50',
        dark: 'dark:border-indigo-400 dark:from-indigo-900/25 dark:to-blue-900/25',
      },
      {
        light: 'border-teal-500 bg-gradient-to-br from-teal-50 to-cyan-50',
        dark: 'dark:border-teal-400 dark:from-teal-900/25 dark:to-cyan-900/25',
      },
      {
        light: 'border-purple-500 bg-gradient-to-br from-purple-50 to-violet-50',
        dark: 'dark:border-purple-400 dark:from-purple-900/25 dark:to-violet-900/25',
      },
      {
        light: 'border-red-500 bg-gradient-to-br from-red-50 to-pink-50',
        dark: 'dark:border-red-400 dark:from-red-900/25 dark:to-pink-900/25',
      },
    ];

    const colorIndex = employee.teamId % teamColors.length;
    return teamColors[colorIndex];
  };

  // Dynamic styling based on team and hierarchy with dark mode support
  const getNodeStyle = () => {
    const teamStyle = getTeamBorderStyle();
    const borderWidth = isTeamLead ? 'border-4' : 'border-2';
    const borderOpacity = isTeamLead ? '' : 'border-opacity-80';

    const baseClasses = `bg-white dark:bg-gray-800 rounded-xl shadow-lg ${borderWidth} ${borderOpacity} p-4 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-300/70 dark:hover:shadow-blue-500/40 hover:drop-shadow-xl active:scale-95 ${
      selected
        ? 'ring-4 ring-purple-400 dark:ring-purple-300 ring-opacity-50 scale-105 shadow-2xl shadow-purple-300/60 dark:shadow-purple-500/40'
        : ''
    }`;

    return `${baseClasses} ${teamStyle.light} ${teamStyle.dark}`;
  };

  const getAvatarColor = () => {
    const name = `${employee.firstName} ${employee.lastName}`;
    const hash = name.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const colors = [
      'bg-red-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
    ];
    return colors[hash % colors.length];
  };

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-purple-500 dark:!bg-purple-400 !border-2 !border-white dark:!border-gray-700"
      />
      <div
        className={`${getNodeStyle()} min-w-[280px] max-w-[320px] cursor-pointer select-none`}
        style={{ pointerEvents: 'all' }}
        onClick={e => {
          e.stopPropagation();
          if (isTeamLead && subordinateCount > 0) {
            onToggleCollapse?.(employee.id);
          } else {
            // Handle regular employee card click - could be used to show details
            console.log('Employee card clicked:', employee);
          }
        }}
        onMouseEnter={e => {
          const glowColor = getTeamGlowColor();
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.transition = 'all 0.2s ease-in-out';
          e.currentTarget.style.boxShadow = `0 25px 50px -12px ${glowColor.shadow}, 0 0 30px ${glowColor.glow}`;
          e.currentTarget.style.filter = `drop-shadow(0 10px 20px ${glowColor.glow})`;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '';
          e.currentTarget.style.filter = '';
        }}
        title={
          isTeamLead && subordinateCount > 0
            ? isCollapsed
              ? 'Click to expand team'
              : 'Click to collapse team'
            : `Click to view ${employee.firstName} ${employee.lastName}'s details`
        }
      >
        {/* Header with Avatar and Name */}
        <div className="flex items-center space-x-3 mb-3">
          <div
            className={`${getAvatarColor()} w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md`}
          >
            {employee.firstName.charAt(0)}
            {employee.lastName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-gray-800 dark:text-white leading-tight truncate">
              {employee.firstName} {employee.lastName}
            </h3>
            {isTeamLead && (
              <div className="inline-flex items-center bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 text-xs font-semibold px-2 py-1 rounded-full mt-1">
                <span className="mr-1">👑</span> Team Lead
              </div>
            )}
          </div>
        </div>

        {/* Employee details */}
        <div className="space-y-2 text-sm">
          {/* Team, Location, and Team Member Count in one line */}
          <div className="flex items-center justify-between text-xs space-x-2">
            <div className="flex items-center space-x-1 flex-1 min-w-0">
              {teamName && (
                <span className="inline-flex items-center bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                  <span className="mr-1">👥</span>
                  <span className="truncate">{teamName}</span>
                </span>
              )}
              {employee.location?.name && (
                <span className="inline-flex items-center bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">
                  <span className="mr-1">📍</span>
                  <span className="truncate">{employee.location.name}</span>
                </span>
              )}
            </div>

            {/* Team member count for team leads */}
            {isTeamLead && subordinateCount > 0 && (
              <div className="flex items-center bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full">
                <span className="mr-1">👥</span>
                <span className="font-semibold">{subordinateCount}</span>
                {isCollapsed && <span className="ml-1 text-xs opacity-75">(hidden)</span>}
              </div>
            )}
          </div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-purple-500 dark:!bg-purple-400 !border-2 !border-white dark:!border-gray-700"
      />
    </>
  );
};

// Define custom node types outside component to ensure they're truly static
const STATIC_NODE_TYPES = {
  employeeNode: EmployeeNode,
} as const;

const ReactFlowOrganizationalChart: React.FC = () => {
  const { isDark } = useTheme();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Collapse/Expand state for team groups - start with all teams collapsed
  const [collapsedTeams, setCollapsedTeams] = useState<Set<number>>(() => {
    // Initialize with all team leads collapsed by default
    if (employees.length && teams.length) {
      const teamLeads = employees.filter(emp => teams.some(team => team.managerId === emp.id));
      return new Set(teamLeads.map(lead => lead.id));
    }
    return new Set();
  });

  // Accordion state for panels - start with controls collapsed
  const [panelStates, setPanelStates] = useState({
    organizationalChart: false,
  });

  // React Flow instance and UI state
  const [layoutDirection, setLayoutDirection] = useState<'TB' | 'LR'>('TB');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [fitViewMode, setFitViewMode] = useState<'all' | 'group'>('all'); // Default to 'all' for collapsed view

  // Memoize fitViewOptions to prevent unnecessary re-renders
  const fitViewOptions = useMemo(
    () => ({
      padding: 0.15,
      minZoom: 0.3,
      maxZoom: 2,
      duration: 800,
    }),
    []
  );

  // Memoize proOptions to prevent unnecessary re-renders
  const proOptions = useMemo(() => ({ hideAttribution: true }), []);

  // Memoize background style to prevent unnecessary re-renders
  const backgroundStyle = useMemo(
    () => ({ backgroundColor: isDark ? '#1f2937' : '#f8fafc' }),
    [isDark]
  );

  // Toggle accordion panels
  const togglePanel = useCallback((panelName: keyof typeof panelStates) => {
    setPanelStates(prev => ({
      ...prev,
      [panelName]: !prev[panelName],
    }));
  }, []);

  // Toggle collapse/expand for team groups
  const toggleTeamCollapse = useCallback(
    (teamLeadId: number) => {
      setCollapsedTeams(prev => {
        const newSet = new Set(prev);
        const wasCollapsed = newSet.has(teamLeadId);

        if (wasCollapsed) {
          // Expanding the team - remove from collapsed set
          newSet.delete(teamLeadId);
          // Automatically switch to group mode when expanding
          setFitViewMode('group');
          console.log('Expanding team - switching to group mode');
        } else {
          // Collapsing the team - add to collapsed set
          newSet.add(teamLeadId);
          // Automatically switch to all mode when collapsing
          setFitViewMode('all');
          console.log('Collapsing team - switching to all mode');
        }

        // Auto fit view after collapse/expand with a slight delay to ensure nodes are updated
        setTimeout(() => {
          if (reactFlowInstance) {
            if (wasCollapsed) {
              // Team was just expanded - zoom to the specific team group
              const teamLeaderNodeId = `employee-${teamLeadId}`;
              console.log('Focusing on expanded team leader:', teamLeaderNodeId);

              // Get all current nodes
              const allNodes = reactFlowInstance.getNodes();
              const teamLeaderNode = allNodes.find((node: Node) => node.id === teamLeaderNodeId);

              if (teamLeaderNode) {
                console.log('Found team leader node:', teamLeaderNode.data.employee.firstName);

                // Get all related nodes (team members) for this team
                const teamNodes = allNodes.filter((node: Node) => {
                  const nodeData = node.data;
                  const sameTeam = nodeData.employee.teamId === teamLeaderNode.data.employee.teamId;
                  const isLeader = node.id === teamLeaderNodeId;
                  return sameTeam || isLeader;
                });

                console.log('Found team nodes for expanded team:', teamNodes.length);

                if (teamNodes.length > 0) {
                  // Calculate bounding box for team nodes
                  const bounds = teamNodes.reduce(
                    (acc: any, node: Node) => {
                      const x = node.position.x;
                      const y = node.position.y;
                      const width = 320; // node width
                      const height = 180; // node height

                      return {
                        x: Math.min(acc.x, x),
                        y: Math.min(acc.y, y),
                        x2: Math.max(acc.x2, x + width),
                        y2: Math.max(acc.y2, y + height),
                      };
                    },
                    {
                      x: Infinity,
                      y: Infinity,
                      x2: -Infinity,
                      y2: -Infinity,
                    }
                  );

                  // Convert to ReactFlow bounds format
                  const rectBounds = {
                    x: bounds.x,
                    y: bounds.y,
                    width: bounds.x2 - bounds.x,
                    height: bounds.y2 - bounds.y,
                  };

                  console.log('Calculated bounds for expanded team:', rectBounds);

                  // Fit view to team group bounds
                  try {
                    reactFlowInstance.fitBounds(rectBounds, {
                      padding: 0.3,
                      minZoom: 0.3,
                      maxZoom: 1.2,
                      duration: 800,
                    });
                  } catch (error) {
                    console.log('fitBounds failed, using setCenter:', error);
                    // Fallback to centering on team leader
                    const centerX = bounds.x + (bounds.x2 - bounds.x) / 2;
                    const centerY = bounds.y + (bounds.y2 - bounds.y) / 2;
                    reactFlowInstance.setCenter(centerX, centerY, { zoom: 0.8, duration: 800 });
                  }
                } else {
                  // Fallback to centering on team leader
                  console.log('No team nodes found, centering on expanded leader');
                  reactFlowInstance.setCenter(
                    teamLeaderNode.position.x + 160,
                    teamLeaderNode.position.y + 90,
                    { zoom: 0.8, duration: 800 }
                  );
                }
              } else {
                console.log('Team leader node not found');
              }
            } else {
              // Team was just collapsed - fit entire chart (all mode)
              console.log('Team collapsed - fitting entire chart');
              reactFlowInstance.fitView({
                padding: 0.2,
                minZoom: 0.1,
                maxZoom: 1.5,
                duration: 800,
                includeHiddenNodes: false,
              });
            }
          }
        }, 300);

        return newSet;
      });
    },
    [reactFlowInstance, setFitViewMode]
  );

  // Filter nodes and edges based on collapsed state
  const getVisibleNodesAndEdges = useCallback(
    (allNodes: Node[], allEdges: Edge[]) => {
      if (collapsedTeams.size === 0) {
        return { visibleNodes: allNodes, visibleEdges: allEdges };
      }

      // Find all employees that should be hidden
      const hiddenEmployeeIds = new Set<string>();

      // Build manager-subordinate relationships
      const managerSubordinates = new Map<string, string[]>();
      allEdges.forEach(edge => {
        if (!managerSubordinates.has(edge.source)) {
          managerSubordinates.set(edge.source, []);
        }
        managerSubordinates.get(edge.source)!.push(edge.target);
      });

      // Recursively hide subordinates of collapsed team leaders
      const hideSubordinates = (managerId: string) => {
        const subordinates = managerSubordinates.get(managerId) || [];
        subordinates.forEach(subordinateId => {
          hiddenEmployeeIds.add(subordinateId);
          hideSubordinates(subordinateId); // Hide their subordinates too
        });
      };

      // Hide subordinates of collapsed team leaders
      collapsedTeams.forEach(teamLeadId => {
        const managerNodeId = `employee-${teamLeadId}`;
        hideSubordinates(managerNodeId);
      });

      // Filter visible nodes and edges
      const visibleNodes = allNodes.filter(node => !hiddenEmployeeIds.has(node.id));
      const visibleEdges = allEdges.filter(
        edge => !hiddenEmployeeIds.has(edge.source) && !hiddenEmployeeIds.has(edge.target)
      );

      return { visibleNodes, visibleEdges };
    },
    [collapsedTeams]
  );

  // Fetch all organizational data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [employeesResponse, teamsResponse, locationsResponse] = await Promise.all([
          adminAPI.getEmployees({ page: 1, limit: 1000 }),
          adminAPI.getTeams(),
          adminAPI.getLocations(),
        ]);

        setEmployees(employeesResponse.employees);
        setTeams(teamsResponse.teams);
        setLocations(locationsResponse.locations);

        // Set all teams as collapsed by default after data is loaded
        const teamLeads = employeesResponse.employees.filter(emp =>
          teamsResponse.teams.some(team => team.managerId === emp.id)
        );
        setCollapsedTeams(new Set(teamLeads.map(lead => lead.id)));
      } catch (err) {
        console.error('Error fetching organizational data:', err);
        setError('Error loading organizational data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Advanced hierarchical layout algorithm
  const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
    const nodeWidth = 320;
    const nodeHeight = 180;
    const levelGap = direction === 'TB' ? 200 : 400;
    const nodeGap = direction === 'TB' ? 100 : 200;

    // Build hierarchy map
    const childrenMap = new Map<string, string[]>();
    const parentMap = new Map<string, string>();
    const rootNodes: string[] = [];

    // Initialize maps
    nodes.forEach(node => {
      childrenMap.set(node.id, []);
    });

    // Build parent-child relationships
    edges.forEach(edge => {
      const children = childrenMap.get(edge.source) || [];
      children.push(edge.target);
      childrenMap.set(edge.source, children);
      parentMap.set(edge.target, edge.source);
    });

    // Find root nodes (nodes with no parents)
    nodes.forEach(node => {
      if (!parentMap.has(node.id)) {
        rootNodes.push(node.id);
      }
    });

    // Calculate positions using level-based layout
    const positions = new Map<string, { x: number; y: number; level: number }>();
    const levelWidths = new Map<number, number>();

    // Calculate node levels and level widths
    const calculateLevels = (nodeId: string, level: number = 0) => {
      if (positions.has(nodeId)) return;

      positions.set(nodeId, { x: 0, y: 0, level });

      const currentWidth = levelWidths.get(level) || 0;
      levelWidths.set(level, currentWidth + 1);

      const children = childrenMap.get(nodeId) || [];
      children.forEach(childId => {
        calculateLevels(childId, level + 1);
      });
    };

    // Calculate levels for all root nodes
    rootNodes.forEach(rootId => {
      calculateLevels(rootId);
    });

    // Position nodes within each level
    const levelNodes = new Map<number, string[]>();
    positions.forEach((pos, nodeId) => {
      const level = pos.level;
      if (!levelNodes.has(level)) {
        levelNodes.set(level, []);
      }
      levelNodes.get(level)!.push(nodeId);
    });

    // Calculate final positions
    levelNodes.forEach((nodeIds, level) => {
      const levelWidth = nodeIds.length;
      const totalWidth = levelWidth * nodeWidth + (levelWidth - 1) * nodeGap;
      const startX = -totalWidth / 2;

      nodeIds.forEach((nodeId, index) => {
        const pos = positions.get(nodeId)!;

        if (direction === 'TB') {
          pos.x = startX + index * (nodeWidth + nodeGap) + nodeWidth / 2;
          pos.y = level * levelGap;
        } else {
          pos.x = level * levelGap;
          pos.y = startX + index * (nodeHeight + nodeGap) + nodeHeight / 2;
        }

        positions.set(nodeId, pos);
      });
    });

    // Apply positions to nodes
    nodes.forEach(node => {
      const pos = positions.get(node.id);
      if (pos) {
        node.position = { x: pos.x, y: pos.y };
        node.targetPosition = direction === 'TB' ? Position.Top : Position.Left;
        node.sourcePosition = direction === 'TB' ? Position.Bottom : Position.Right;
      }
    });

    return { nodes, edges };
  };

  // Build hierarchical organizational structure
  const buildOrganizationalHierarchy = useCallback(() => {
    if (!employees.length || !teams.length) return { nodes: [], edges: [] };

    const teamMap = new Map(teams.map(team => [team.id, team]));
    const locationMap = new Map(locations.map(location => [location.id, location]));

    // Create a proper hierarchy based on team manager relationships
    const employeeMap = new Map(employees.map(emp => [emp.id, emp]));
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Helper function to get employee level in hierarchy
    const getEmployeeLevel = (employeeId: number, visited = new Set<number>()): number => {
      if (visited.has(employeeId)) return 0; // Avoid circular references
      visited.add(employeeId);

      const employee = employeeMap.get(employeeId);
      if (!employee?.teamId) return 0;

      const team = teamMap.get(employee.teamId);
      if (!team?.managerId || team.managerId === employeeId) return 0;

      return 1 + getEmployeeLevel(team.managerId, visited);
    };

    // Find all managers and their relationships
    const managerRelationships = new Map<number, number[]>(); // manager -> subordinates

    employees.forEach(employee => {
      if (employee.teamId) {
        const team = teamMap.get(employee.teamId);
        if (team?.managerId && team.managerId !== employee.id) {
          if (!managerRelationships.has(team.managerId)) {
            managerRelationships.set(team.managerId, []);
          }
          managerRelationships.get(team.managerId)!.push(employee.id);
        }
      }
    });

    // Process each employee
    employees.forEach(employee => {
      const team = employee.teamId ? teamMap.get(employee.teamId) : undefined;
      const location = employee.locationId ? locationMap.get(employee.locationId) : undefined;
      const isTeamLead = team?.managerId === employee.id;
      const subordinates = managerRelationships.get(employee.id) || [];
      const level = getEmployeeLevel(employee.id);

      // Add employee to location/team lookup for enhanced data
      const enhancedEmployee = {
        ...employee,
        team,
        location,
      };

      const node: Node = {
        id: `employee-${employee.id}`,
        type: 'employeeNode',
        position: { x: 0, y: 0 }, // Will be set by layout algorithm
        data: {
          employee: enhancedEmployee,
          isTeamLead,
          subordinateCount: subordinates.length,
          level,
          teamName: team?.name,
          isCollapsed: collapsedTeams.has(employee.id),
          onToggleCollapse: toggleTeamCollapse,
        },
      };

      nodes.push(node);

      // Create edges to subordinates with team-based colors
      subordinates.forEach(subordinateId => {
        // Get team-based edge color
        const getTeamEdgeColor = (teamId?: number) => {
          if (!teamId) return { main: '#6b7280', light: '#9ca3af' }; // gray for no team

          const teamColors = [
            { main: '#3b82f6', light: '#60a5fa' }, // blue
            { main: '#10b981', light: '#34d399' }, // emerald
            { main: '#f97316', light: '#fb923c' }, // orange
            { main: '#ec4899', light: '#f472b6' }, // pink
            { main: '#6366f1', light: '#818cf8' }, // indigo
            { main: '#14b8a6', light: '#2dd4bf' }, // teal
            { main: '#8b5cf6', light: '#a78bfa' }, // purple
            { main: '#ef4444', light: '#f87171' }, // red
          ];

          const colorIndex = teamId % teamColors.length;
          return teamColors[colorIndex];
        };

        const teamColor = getTeamEdgeColor(employee.teamId);
        const edgeColor = isTeamLead ? teamColor.main : teamColor.light;

        edges.push({
          id: `edge-${employee.id}-${subordinateId}`,
          source: `employee-${employee.id}`,
          target: `employee-${subordinateId}`,
          type: 'smoothstep',
          animated: true,
          style: {
            stroke: edgeColor,
            strokeWidth: isTeamLead ? 4 : 3,
            strokeDasharray: isTeamLead ? '0' : '8 4',
            strokeOpacity: 0.8,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: edgeColor,
            width: isTeamLead ? 22 : 18,
            height: isTeamLead ? 22 : 18,
          },
        });
      });
    });

    return { nodes, edges };
  }, [employees, teams, locations, collapsedTeams, toggleTeamCollapse]);

  // Calculate hierarchical structure and create nodes/edges
  const { processedNodes, processedEdges } = useMemo(() => {
    const { nodes, edges } = buildOrganizationalHierarchy();

    if (nodes.length === 0) return { processedNodes: [], processedEdges: [] };

    // Apply automatic layout
    const layouted = getLayoutedElements(nodes, edges);

    // Filter nodes and edges based on collapsed state
    const { visibleNodes, visibleEdges } = getVisibleNodesAndEdges(layouted.nodes, layouted.edges);

    return {
      processedNodes: visibleNodes,
      processedEdges: visibleEdges,
    };
  }, [buildOrganizationalHierarchy, getVisibleNodesAndEdges]);

  // Update nodes and edges when data changes
  useEffect(() => {
    // Force update by creating new arrays
    setNodes([...processedNodes]);
    setEdges([...processedEdges]);
  }, [processedNodes, processedEdges, setNodes, setEdges, collapsedTeams]);

  // Auto-fit view when nodes are first loaded or when switching to collapsed view
  useEffect(() => {
    if (reactFlowInstance && processedNodes.length > 0) {
      // Small delay to ensure nodes are rendered
      setTimeout(() => {
        reactFlowInstance.fitView({
          padding: 0.2,
          minZoom: 0.1,
          maxZoom: 1.5,
          duration: 800,
          includeHiddenNodes: false,
        });
      }, 300);
    }
  }, [reactFlowInstance, processedNodes.length, collapsedTeams.size]);

  const onNodeClick = useCallback(
    (event: any, node: Node) => {
      setSelectedNode(node.id === selectedNode ? null : node.id);

      // If in group mode, focus on the clicked node's team
      if (fitViewMode === 'group' && reactFlowInstance) {
        console.log(
          'Group mode node click:',
          node.data.employee.firstName,
          node.data.employee.lastName
        );

        setTimeout(() => {
          const allNodes = reactFlowInstance.getNodes();
          const clickedEmployee = node.data.employee;

          // Get all nodes in the same team
          const teamNodes = allNodes.filter((n: Node) => {
            const nodeData = n.data;
            return nodeData.employee.teamId === clickedEmployee.teamId;
          });

          console.log('Found team nodes for focusing:', teamNodes.length);

          if (teamNodes.length > 0) {
            // Calculate bounding box for team nodes
            const bounds = teamNodes.reduce(
              (acc: any, n: Node) => {
                const x = n.position.x;
                const y = n.position.y;
                const width = 320; // node width
                const height = 180; // node height

                return {
                  x: Math.min(acc.x, x),
                  y: Math.min(acc.y, y),
                  x2: Math.max(acc.x2, x + width),
                  y2: Math.max(acc.y2, y + height),
                };
              },
              {
                x: Infinity,
                y: Infinity,
                x2: -Infinity,
                y2: -Infinity,
              }
            );

            // Convert to ReactFlow bounds format
            const rectBounds = {
              x: bounds.x,
              y: bounds.y,
              width: bounds.x2 - bounds.x,
              height: bounds.y2 - bounds.y,
            };

            console.log('Node click - calculated bounds:', rectBounds);

            // Fit view to team group bounds
            try {
              reactFlowInstance.fitBounds(rectBounds, {
                padding: 0.3,
                minZoom: 0.3,
                maxZoom: 1.2,
                duration: 800,
              });
            } catch (error) {
              console.log('Node click - fitBounds failed, using setCenter:', error);
              // Fallback to centering on clicked node
              const centerX = bounds.x + (bounds.x2 - bounds.x) / 2;
              const centerY = bounds.y + (bounds.y2 - bounds.y) / 2;
              reactFlowInstance.setCenter(centerX, centerY, { zoom: 0.8, duration: 800 });
            }
          } else {
            // Single node - center on it
            console.log('Single node - centering on clicked node');
            reactFlowInstance.setCenter(node.position.x + 160, node.position.y + 90, {
              zoom: 0.8,
              duration: 800,
            });
          }
        }, 100);
      }
    },
    [selectedNode, fitViewMode, reactFlowInstance]
  );

  const onInit = useCallback((instance: any) => {
    setReactFlowInstance(instance);
  }, []);

  const changeLayout = useCallback(
    (direction: 'TB' | 'LR') => {
      setLayoutDirection(direction);

      // Recalculate layout with new direction
      const { nodes, edges } = buildOrganizationalHierarchy();
      if (nodes.length > 0) {
        const layouted = getLayoutedElements(nodes, edges, direction);
        const { visibleNodes, visibleEdges } = getVisibleNodesAndEdges(
          layouted.nodes,
          layouted.edges
        );
        setNodes(visibleNodes);
        setEdges(visibleEdges);
      }
    },
    [buildOrganizationalHierarchy, getVisibleNodesAndEdges, setNodes, setEdges]
  );

  const onConnect = useCallback(() => {
    // Prevent manual connections in org chart
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 dark:border-purple-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading organizational chart...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-red-600 dark:text-red-400">
          <p className="text-lg font-semibold mb-2">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!employees.length) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p className="text-lg font-semibold mb-2">No Employees Found</p>
          <p>Add employees to see the organizational chart.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[90vh] bg-gradient-to-br from-gray-50 to-gray-100">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onInit={onInit}
        nodeTypes={STATIC_NODE_TYPES}
        connectionMode={ConnectionMode.Loose}
        fitView={false} // Disable automatic fitView to prevent zoom issues
        fitViewOptions={fitViewOptions}
        className="reactflow-wrapper"
        proOptions={proOptions}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
      >
        <Background
          color={isDark ? '#4b5563' : '#94a3b8'}
          gap={30}
          size={2}
          style={backgroundStyle}
        />

        {/* Enhanced Statistics Panel - Top Right */}
        <Panel
          position="top-right"
          className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200 dark:border-gray-600 p-4"
        >
          <div className="flex items-center space-x-4">
            {/* Employees Counter */}
            <div className="flex flex-col items-center justify-center bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 px-4 py-3 rounded-lg border border-blue-200 dark:border-blue-700 min-w-[80px]">
              <div className="font-bold text-blue-800 dark:text-blue-200 text-lg text-center">
                {employees.length}
              </div>
              <div className="text-blue-600 dark:text-blue-400 font-medium text-xs text-center">
                Employees
              </div>
            </div>

            {/* Teams Counter */}
            <div className="flex flex-col items-center justify-center bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 px-4 py-3 rounded-lg border border-emerald-200 dark:border-emerald-700 min-w-[80px]">
              <div className="font-bold text-emerald-800 dark:text-emerald-200 text-lg text-center">
                {teams.length}
              </div>
              <div className="text-emerald-600 dark:text-emerald-400 font-medium text-xs text-center">
                Teams
              </div>
            </div>

            {/* Team Leads Counter */}
            <div className="flex flex-col items-center justify-center bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 px-4 py-3 rounded-lg border border-purple-200 dark:border-purple-700 min-w-[80px]">
              <div className="font-bold text-purple-800 dark:text-purple-200 text-lg text-center">
                {employees.filter(emp => teams.some(team => team.managerId === emp.id)).length}
              </div>
              <div className="text-purple-600 dark:text-purple-400 font-medium text-xs text-center">
                Leaders
              </div>
            </div>

            {/* Locations Counter */}
            <div className="flex flex-col items-center justify-center bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 px-4 py-3 rounded-lg border border-orange-200 dark:border-orange-700 min-w-[80px]">
              <div className="font-bold text-orange-800 dark:text-orange-200 text-lg text-center">
                {new Set(employees.map(emp => emp.locationId).filter(Boolean)).size}
              </div>
              <div className="text-orange-600 dark:text-orange-400 font-medium text-xs text-center">
                Locations
              </div>
            </div>
          </div>
        </Panel>

        {/* Simplified Controls Panel at Bottom */}
        <Panel
          position="bottom-center"
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-600 mb-4"
        >
          <div className="flex items-center space-x-2 px-4 py-2">
            {/* Controls Toggle */}
            <button
              onClick={() => togglePanel('organizationalChart')}
              className="flex items-center space-x-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <span className="text-sm font-medium text-gray-800 dark:text-white">Controls</span>
              <span
                className={`transform transition-transform duration-200 text-xs ${
                  panelStates.organizationalChart ? 'rotate-90' : 'rotate-0'
                }`}
              >
                ▶️
              </span>
            </button>

            {/* Expanded Controls Content */}
            {panelStates.organizationalChart && (
              <div className="flex items-center space-x-2 pl-4 border-l border-gray-200 dark:border-gray-600">
                {/* Collapse/Expand All Buttons */}
                <button
                  onClick={() => {
                    const teamLeads = employees.filter(emp =>
                      teams.some(team => team.managerId === emp.id)
                    );
                    setCollapsedTeams(new Set(teamLeads.map(lead => lead.id)));
                    setFitViewMode('all');

                    setTimeout(() => {
                      if (reactFlowInstance) {
                        reactFlowInstance.fitView({
                          padding: 0.2,
                          minZoom: 0.1,
                          maxZoom: 1.5,
                          duration: 800,
                          includeHiddenNodes: false,
                        });
                      }
                    }, 200);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-800/70 transition-all"
                >
                  <span>📁</span>
                  <span>Collapse All</span>
                </button>
                <button
                  onClick={() => {
                    setCollapsedTeams(new Set());
                    setFitViewMode('group');

                    setTimeout(() => {
                      if (reactFlowInstance) {
                        reactFlowInstance.fitView({
                          padding: 0.3,
                          minZoom: 0.3,
                          maxZoom: 1.2,
                          duration: 800,
                          includeHiddenNodes: false,
                        });
                      }
                    }, 200);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/70 transition-all"
                >
                  <span>📂</span>
                  <span>Expand All</span>
                </button>
              </div>
            )}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default ReactFlowOrganizationalChart;
export type { EmployeeNodeData };
