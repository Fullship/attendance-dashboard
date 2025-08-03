import React, { useEffect, useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { attendanceAPI, userAPI, handleApiError } from '../utils/api';
import { formatDateWithDay } from '../utils/dateUtils';
import { AttendanceStats, AttendanceRecord, CalendarData, Holiday } from '../types';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import ClockRequestModal from '../components/ClockRequestModal';
import LeaveRequestModal from '../components/LeaveRequestModal';
import MyLeaveRequests from '../components/MyLeaveRequests';
import {
  NumberTicker,
  GradientText,
  MagicCard,
  FadeInStagger,
  Sparkles,
  ShimmerButton,
  CalendarGrid,
  CalendarHeaderDay,
  CalendarDayCell,
  StatusIndicator,
  HoursWorkedText,
  CalendarLegend,
  LegendItem,
  SourceIcon,
  MonthNavButton,
} from '../components/ui';
import { ReactPerformanceProfiler } from '../utils/ReactPerformanceProfiler';
import toast from 'react-hot-toast';

const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [showClockRequestModal, setShowClockRequestModal] = useState(false);
  const [showLeaveRequestModal, setShowLeaveRequestModal] = useState(false);
  const [clockRequestType, setClockRequestType] = useState<'clock_in' | 'clock_out'>('clock_in');
  const [activeTab, setActiveTab] = useState<'overview' | 'leave-requests'>('overview');
  const [leaveRequestsRefresh, setLeaveRequestsRefresh] = useState(0);

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const [statsResponse, calendarResponse, leaveResponse] = await Promise.all([
        attendanceAPI.getStats('30'),
        attendanceAPI.getCalendar(
          currentDate.getMonth() + 1,
          currentDate.getFullYear(),
          forceRefresh
        ),
        userAPI.getMyLeaveRequests({
          year: currentDate.getFullYear(),
          limit: 100, // Get enough to cover the year
          force: forceRefresh, // Force bypass cache when needed
        }),
      ]);

      setStats(statsResponse.summary);
      setCalendarData(calendarResponse);
      setLeaveRequests(leaveResponse.leaveRequests || []);
    } catch (error) {
      toast.error(handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  const fetchHolidays = async () => {
    try {
      const holidaysData = await attendanceAPI.getHolidays();
      setHolidays(holidaysData);
    } catch (error) {
      console.error('Error fetching holidays:', error);
      // Don't show error toast for holidays as it's not critical
    }
  };

  const handleClockIn = async () => {
    setClockRequestType('clock_in');
    setShowClockRequestModal(true);
  };

  const handleClockOut = async () => {
    setClockRequestType('clock_out');
    setShowClockRequestModal(true);
  };

  const handleClockRequestSubmitted = () => {
    // Optionally refresh data here
    fetchData();
  };

  const handleLeaveRequestSubmitted = () => {
    setLeaveRequestsRefresh(prev => prev + 1);
    // Force refresh calendar data to show new leave request immediately
    console.log('Leave request submitted, forcing calendar refresh...');
    fetchData(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-500';
      case 'late':
        return 'bg-yellow-500';
      case 'absent':
        return 'bg-red-500';
      case 'early_leave':
        return 'bg-orange-500';
      default:
        return 'bg-gray-300';
    }
  };

  const isManualRequest = (record: AttendanceRecord) => {
    // Check if the notes contain text indicating it was from a manual clock request
    return (
      record.notes &&
      (record.notes.includes('Clock-in request approved') ||
        record.notes.includes('Clock-out request approved') ||
        record.notes.includes('request approved by admin'))
    );
  };

  const getSourceIcon = (record: AttendanceRecord) => {
    if (isManualRequest(record)) {
      return (
        <span className="text-xs mr-1" title="Manual Request">
          👤
        </span>
      );
    } else {
      return (
        <span className="text-xs mr-1" title="Device Upload">
          💻
        </span>
      );
    }
  };

  const isHoliday = (date: Date): Holiday | null => {
    return (
      holidays.find(holiday => {
        const holidayDate = new Date(holiday.date);
        return isSameDay(holidayDate, date);
      }) || null
    );
  };

  // Check if a date has any leave requests
  const getLeaveRequestForDate = (date: Date) => {
    return leaveRequests.find(request => {
      const startDate = new Date(request.startDate);
      const endDate = new Date(request.endDate);
      return date >= startDate && date <= endDate;
    });
  };

  // Leave status indicator component (vertical bar only)
  const LeaveStatusIndicator: React.FC<{ status: string }> = ({ status }) => {
    const getStatusColor = () => {
      switch (status) {
        case 'pending':
          return 'bg-yellow-500';
        case 'approved':
          return 'bg-green-500';
        case 'rejected':
          return 'bg-red-500';
        default:
          return 'bg-gray-500';
      }
    };

    return (
      <div className="absolute top-0 right-0 h-full flex items-start">
        {/* Vertical status bar */}
        <div className={`w-1 h-full ${getStatusColor()}`} title={`Leave status: ${status}`} />
      </div>
    );
  };

  const renderCalendar = () => {
    if (!calendarData) return null;

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Get the day of the week for the first day of the month (0 = Sunday)
    const firstDayOfWeek = monthStart.getDay();

    // Create empty cells for days before the first day of the month
    const emptyCells = Array(firstDayOfWeek).fill(null);

    return (
      <CalendarGrid key={`${monthStart.getMonth()}-${monthStart.getFullYear()}`}>
        {/* Calendar header */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
          <CalendarHeaderDay
            key={day}
            index={index}
            className={`p-2 text-center font-semibold ${
              index === 5 || index === 6
                ? 'text-purple-600 dark:text-purple-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {day}
          </CalendarHeaderDay>
        ))}

        {/* Empty cells for days before the first day of the month */}
        {emptyCells.map((_, index) => (
          <CalendarDayCell
            key={`empty-${index}`}
            index={index + 7} // Offset by header days
            className="p-2 h-20 border border-gray-200 dark:border-gray-700 opacity-30"
          >
            {/* Empty cell */}
          </CalendarDayCell>
        ))}

        {/* Calendar days */}
        {days.map((day, dayIndex) => {
          const record = calendarData.records.find(r => isSameDay(new Date(r.date), day));

          const dayOfWeek = day.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
          const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Friday or Saturday
          const holiday = isHoliday(day);
          const leaveRequest = getLeaveRequestForDate(day);
          const cellIndex = dayIndex + 7 + emptyCells.length; // Offset by header and empty cells

          return (
            <CalendarDayCell
              key={day.toString()}
              index={cellIndex}
              isToday={isToday(day)}
              hasRecord={!!record}
              className={`p-2 h-20 border border-gray-200 dark:border-gray-700 relative ${
                isToday(day)
                  ? 'bg-primary-50 dark:bg-primary-900/20 ring-0.5 ring-primary-300 dark:ring-primary-700'
                  : holiday
                  ? 'bg-green-50 dark:bg-green-900/20 ring-0.5 ring-green-300 dark:ring-green-700'
                  : isWeekend
                  ? 'bg-purple-50 dark:bg-purple-900/20'
                  : ''
              }`}
            >
              {/* Leave request status indicator */}
              {leaveRequest && <LeaveStatusIndicator status={leaveRequest.status} />}

              <div className="flex flex-col h-full">
                <span
                  className={`text-sm ${
                    isToday(day)
                      ? 'font-bold text-primary-600'
                      : holiday
                      ? 'font-medium text-green-600 dark:text-green-400'
                      : isWeekend
                      ? 'font-medium text-purple-600 dark:text-purple-400'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {format(day, 'd')}
                </span>
                {record && (
                  <div className="flex-1 flex flex-col justify-center items-center">
                    <div className="flex items-center mb-1">
                      <SourceIcon delay={cellIndex * 0.03}>{getSourceIcon(record)}</SourceIcon>
                      <StatusIndicator
                        className={getStatusColor(record.status)}
                        delay={cellIndex * 0.03}
                      />
                    </div>
                    {record.hours_worked > 0 && (
                      <HoursWorkedText delay={cellIndex * 0.03}>
                        {record.hours_worked}h
                      </HoursWorkedText>
                    )}
                    {/* Show holiday name even when there's an attendance record */}
                    {holiday && (
                      <span className="text-xs text-green-500 dark:text-green-400 opacity-80 text-center mt-1">
                        {holiday.name}
                      </span>
                    )}
                  </div>
                )}
                {/* Holiday indicator for days without attendance records */}
                {holiday && !record && (
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-xs text-green-500 dark:text-green-400 opacity-80 text-center">
                      {holiday.name}
                    </span>
                  </div>
                )}
                {/* Weekend indicator */}
                {isWeekend && !record && !holiday && (
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-xs text-purple-500 dark:text-purple-400 opacity-60">
                      Weekend
                    </span>
                  </div>
                )}
                {/* Leave request indicator */}
                {leaveRequest && !record && (
                  <div className="flex-1 flex items-center justify-center relative">
                    <div className="flex items-center">
                      <span className="text-xs mr-1">
                        {(() => {
                          switch (leaveRequest.leaveType) {
                            case 'vacation':
                              return '🏖️';
                            case 'sick':
                              return '🤒';
                            case 'personal':
                              return '👤';
                            case 'emergency':
                              return '🚨';
                            case 'maternity':
                              return '🤱';
                            case 'paternity':
                              return '👶';
                            default:
                              return '📅';
                          }
                        })()}
                      </span>
                      <span className="text-xs text-blue-500 dark:text-blue-400 opacity-80">
                        Leave {leaveRequest.status}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CalendarDayCell>
          );
        })}
      </CalendarGrid>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <ReactPerformanceProfiler id="EmployeeDashboard" threshold={200}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />

        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* Welcome Section */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Welcome back, {user?.firstName}!
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Track your attendance and manage your leave requests
              </p>
            </div>

            {/* Navigation Tabs */}
            <div className="mb-8">
              <nav className="flex space-x-8" aria-label="Tabs">
                <button
                  onClick={() => {
                    setActiveTab('overview');
                    // Force refresh calendar when switching back to overview
                    console.log('Switching to overview tab, forcing calendar refresh...');
                    fetchData(true);
                  }}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'overview'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => {
                    setActiveTab('leave-requests');
                    // Force refresh when switching to leave requests tab
                    setLeaveRequestsRefresh(prev => prev + 1);
                  }}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'leave-requests'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  My Leave Requests
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <>
                {/* Clock In/Out Section */}
                <Card className="mb-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Quick Actions
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {formatDateWithDay(new Date())}
                      </p>
                    </div>
                    <div className="flex space-x-4">
                      <ShimmerButton
                        onClick={handleClockIn}
                        background="linear-gradient(45deg, #10b981, #059669)"
                      >
                        Clock In Request
                      </ShimmerButton>
                      <ShimmerButton
                        onClick={handleClockOut}
                        background="linear-gradient(45deg, #f59e0b, #d97706)"
                      >
                        Clock Out Request
                      </ShimmerButton>
                      <ShimmerButton
                        onClick={() => setShowLeaveRequestModal(true)}
                        background="linear-gradient(45deg, #8b5cf6, #7c3aed)"
                      >
                        Request Leave
                      </ShimmerButton>
                    </div>
                  </div>
                </Card>

                {/* Stats Cards */}
                {stats && (
                  <FadeInStagger
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
                    staggerDelay={0.1}
                  >
                    <MagicCard gradientColor="#10b981" className="p-0">
                      <div className="text-center p-6">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          <NumberTicker value={stats.presentDays} />
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Present Days</div>
                      </div>
                    </MagicCard>

                    <MagicCard gradientColor="#ef4444" className="p-0">
                      <div className="text-center p-6">
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                          <NumberTicker value={stats.absentDays} />
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Absent Days</div>
                      </div>
                    </MagicCard>

                    <MagicCard gradientColor="#f59e0b" className="p-0">
                      <div className="text-center p-6">
                        <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                          <NumberTicker value={stats.lateDays} />
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Late Days</div>
                      </div>
                    </MagicCard>

                    <MagicCard gradientColor="#3b82f6" className="p-0">
                      <div className="text-center p-6">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          <NumberTicker value={parseFloat(stats.averageHours)} />h
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Avg Hours/Day
                        </div>
                      </div>
                    </MagicCard>
                  </FadeInStagger>
                )}

                {/* Calendar */}
                <Card
                  title={
                    <Sparkles>
                      <GradientText colors={['#3b82f6', '#8b5cf6', '#ec4899']}>
                        Attendance Calendar
                      </GradientText>
                    </Sparkles>
                  }
                  subtitle={format(currentDate, 'MMMM yyyy')}
                  action={
                    <div className="flex space-x-2">
                      <MonthNavButton
                        direction="prev"
                        className="px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                        onClick={() =>
                          setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))
                        }
                      >
                        Previous
                      </MonthNavButton>
                      <MonthNavButton
                        direction="next"
                        className="px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                        onClick={() =>
                          setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))
                        }
                      >
                        Next
                      </MonthNavButton>
                    </div>
                  }
                >
                  {renderCalendar()}

                  {/* Compact Legend */}
                  <CalendarLegend>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Calendar Legend
                    </h4>

                    {/* Legend container with light background */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      {/* Compact 2-column layout */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                        {/* Left Column: Status & Source */}
                        <div className="space-y-3">
                          {/* Status Indicators */}
                          <div>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                              Status
                            </span>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                              <LegendItem index={0} className="flex items-center">
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500 mr-1.5" />
                                <span className="text-gray-600 dark:text-gray-400">Present</span>
                              </LegendItem>
                              <LegendItem index={1} className="flex items-center">
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 mr-1.5" />
                                <span className="text-gray-600 dark:text-gray-400">Late</span>
                              </LegendItem>
                              <LegendItem index={2} className="flex items-center">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500 mr-1.5" />
                                <span className="text-gray-600 dark:text-gray-400">Absent</span>
                              </LegendItem>
                              <LegendItem index={3} className="flex items-center">
                                <div className="w-2.5 h-2.5 rounded-full bg-orange-500 mr-1.5" />
                                <span className="text-gray-600 dark:text-gray-400">
                                  Early Leave
                                </span>
                              </LegendItem>
                            </div>
                          </div>

                          {/* Source & Day Types */}
                          <div className="grid grid-cols-2 gap-x-3">
                            <div>
                              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                                Source
                              </span>
                              <div className="space-y-1">
                                <LegendItem index={4} className="flex items-center">
                                  <span className="text-xs mr-1.5">👤</span>
                                  <span className="text-gray-600 dark:text-gray-400">Manual</span>
                                </LegendItem>
                                <LegendItem index={5} className="flex items-center">
                                  <span className="text-xs mr-1.5">💻</span>
                                  <span className="text-gray-600 dark:text-gray-400">Device</span>
                                </LegendItem>
                              </div>
                            </div>

                            <div>
                              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                                Special Days
                              </span>
                              <div className="space-y-1">
                                <LegendItem index={6} className="flex items-center">
                                  <div className="w-2.5 h-2.5 rounded bg-green-50 dark:bg-green-900/20 ring-1 ring-green-300 dark:ring-green-700 mr-1.5" />
                                  <span className="text-gray-600 dark:text-gray-400">Holiday</span>
                                </LegendItem>
                                <LegendItem index={7} className="flex items-center">
                                  <div className="w-2.5 h-2.5 rounded bg-purple-50 dark:bg-purple-900/20 mr-1.5" />
                                  <span className="text-gray-600 dark:text-gray-400">Weekend</span>
                                </LegendItem>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right Column: Leave Status & Types */}
                        <div className="space-y-3">
                          {/* Leave Status */}
                          <div>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                              Leave Status
                            </span>
                            <div className="grid grid-cols-3 gap-x-3 gap-y-1">
                              <LegendItem index={8} className="flex items-center">
                                <div className="w-0.5 h-2.5 bg-yellow-500 mr-1.5" />
                                <span className="text-gray-600 dark:text-gray-400">Pending</span>
                              </LegendItem>
                              <LegendItem index={9} className="flex items-center">
                                <div className="w-0.5 h-2.5 bg-green-500 mr-1.5" />
                                <span className="text-gray-600 dark:text-gray-400">Approved</span>
                              </LegendItem>
                              <LegendItem index={10} className="flex items-center">
                                <div className="w-0.5 h-2.5 bg-red-500 mr-1.5" />
                                <span className="text-gray-600 dark:text-gray-400">Rejected</span>
                              </LegendItem>
                            </div>
                          </div>

                          {/* Leave Types */}
                          <div>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                              Leave Types
                            </span>
                            <div className="grid grid-cols-3 gap-x-2 gap-y-1">
                              <LegendItem index={11} className="flex items-center">
                                <span className="mr-1">🏖️</span>
                                <span className="text-gray-500 dark:text-gray-500">Vacation</span>
                              </LegendItem>
                              <LegendItem index={12} className="flex items-center">
                                <span className="mr-1">🤒</span>
                                <span className="text-gray-500 dark:text-gray-500">Sick</span>
                              </LegendItem>
                              <LegendItem index={13} className="flex items-center">
                                <span className="mr-1">👤</span>
                                <span className="text-gray-500 dark:text-gray-500">Personal</span>
                              </LegendItem>
                              <LegendItem index={14} className="flex items-center">
                                <span className="mr-1">🚨</span>
                                <span className="text-gray-500 dark:text-gray-500">Emergency</span>
                              </LegendItem>
                              <LegendItem index={15} className="flex items-center">
                                <span className="mr-1">🤱</span>
                                <span className="text-gray-500 dark:text-gray-500">Maternity</span>
                              </LegendItem>
                              <LegendItem index={16} className="flex items-center">
                                <span className="mr-1">👶</span>
                                <span className="text-gray-500 dark:text-gray-500">Paternity</span>
                              </LegendItem>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CalendarLegend>
                </Card>
              </>
            )}

            {activeTab === 'leave-requests' && (
              <MyLeaveRequests
                refreshTrigger={leaveRequestsRefresh}
                onLeaveRequestChanged={() => {
                  console.log('Leave request changed, forcing calendar refresh...');
                  fetchData(true);
                }}
              />
            )}
          </div>
        </div>

        {/* Clock Request Modal */}
        <ClockRequestModal
          isOpen={showClockRequestModal}
          onClose={() => setShowClockRequestModal(false)}
          onRequestSubmitted={handleClockRequestSubmitted}
          initialRequestType={clockRequestType}
        />

        {/* Leave Request Modal */}
        <LeaveRequestModal
          isOpen={showLeaveRequestModal}
          onClose={() => setShowLeaveRequestModal(false)}
          onRequestSubmitted={handleLeaveRequestSubmitted}
        />
      </div>
    </ReactPerformanceProfiler>
  );
};

export default EmployeeDashboard;
