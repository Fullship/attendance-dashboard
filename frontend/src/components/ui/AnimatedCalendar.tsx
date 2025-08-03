import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimatedCalendarProps {
  children: React.ReactNode;
  key?: string | number;
}

// Staggered children animation wrapper
export const CalendarGrid: React.FC<AnimatedCalendarProps> = ({ children, key }) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={key}
        className="grid grid-cols-7 gap-1"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ 
          duration: 0.3,
          ease: "easeOut"
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

// Calendar header day animation
export const CalendarHeaderDay: React.FC<{
  children: React.ReactNode;
  index: number;
  className?: string;
}> = ({ children, index, className }) => {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.05,
        duration: 0.3,
        ease: "easeOut"
      }}
    >
      {children}
    </motion.div>
  );
};

// Calendar day cell with hover animations
export const CalendarDayCell: React.FC<{
  children: React.ReactNode;
  index: number;
  className?: string;
  isToday?: boolean;
  hasRecord?: boolean;
  onClick?: () => void;
}> = ({ children, index, className, isToday, hasRecord, onClick }) => {
  return (
    <motion.div
      className={`${className} cursor-pointer`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ 
        scale: 1.05,
        boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)",
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.95 }}
      transition={{
        delay: index * 0.03,
        duration: 0.4,
        ease: "easeOut"
      }}
      onClick={onClick}
    >
      {/* Animated background for today */}
      {isToday && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-500/20 rounded-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
      )}
      
      {/* Subtle pulse animation for days with records */}
      {hasRecord && (
        <motion.div
          className="absolute inset-0 bg-green-400/5 rounded-md"
          animate={{ 
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}
      
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
};

// Status indicator with bounce animation
export const StatusIndicator: React.FC<{
  className: string;
  delay?: number;
}> = ({ className, delay = 0 }) => {
  return (
    <motion.div
      className={`w-3 h-3 rounded-full ${className}`}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{
        delay: delay + 0.5,
        type: "spring",
        stiffness: 500,
        damping: 25
      }}
      whileHover={{ scale: 1.3 }}
    />
  );
};

// Animated hours worked text
export const HoursWorkedText: React.FC<{
  children: React.ReactNode;
  delay?: number;
}> = ({ children, delay = 0 }) => {
  return (
    <motion.span
      className="text-xs text-gray-600 dark:text-gray-400"
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: delay + 0.6,
        duration: 0.3
      }}
    >
      {children}
    </motion.span>
  );
};

// Calendar legend with staggered animations
export const CalendarLegend: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        delay: 0.8,
        duration: 0.5,
        ease: "easeOut"
      }}
    >
      {children}
    </motion.div>
  );
};

// Legend item with hover animation
export const LegendItem: React.FC<{
  children: React.ReactNode;
  index: number;
  className?: string;
}> = ({ children, index, className }) => {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 5, transition: { duration: 0.2 } }}
      transition={{
        delay: 1 + (index * 0.1),
        duration: 0.3
      }}
    >
      {children}
    </motion.div>
  );
};

// Source icon with rotation animation
export const SourceIcon: React.FC<{
  children: React.ReactNode;
  delay?: number;
}> = ({ children, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, rotate: 180 }}
      animate={{ opacity: 1, rotate: 0 }}
      transition={{
        delay: delay + 0.4,
        duration: 0.4,
        ease: "easeOut"
      }}
      whileHover={{ 
        rotate: 360,
        transition: { duration: 0.5 }
      }}
    >
      {children}
    </motion.div>
  );
};

// Month navigation buttons with enhanced animations
export const MonthNavButton: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  direction?: 'prev' | 'next';
}> = ({ children, onClick, className, direction = 'next' }) => {
  return (
    <motion.button
      className={className}
      onClick={onClick}
      whileHover={{ 
        scale: 1.05,
        boxShadow: "0 8px 25px rgba(0, 0, 0, 0.15)",
      }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      initial={{ 
        opacity: 0, 
        x: direction === 'prev' ? -20 : 20 
      }}
      animate={{ 
        opacity: 1, 
        x: 0 
      }}
    >
      <motion.div
        whileHover={{
          x: direction === 'prev' ? -2 : 2,
          transition: { duration: 0.2 }
        }}
      >
        {children}
      </motion.div>
    </motion.button>
  );
};

const AnimatedCalendarComponents = {
  CalendarGrid,
  CalendarHeaderDay,
  CalendarDayCell,
  StatusIndicator,
  HoursWorkedText,
  CalendarLegend,
  LegendItem,
  SourceIcon,
  MonthNavButton
};

export default AnimatedCalendarComponents;
