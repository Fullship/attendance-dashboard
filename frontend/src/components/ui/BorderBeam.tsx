import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface BorderBeamProps {
  children: React.ReactNode;
  className?: string;
  size?: number;
  duration?: number;
  borderWidth?: number;
  colorFrom?: string;
  colorTo?: string;
  delay?: number;
}

const BorderBeam: React.FC<BorderBeamProps> = ({
  children,
  className = '',
  size = 200,
  duration = 15,
  borderWidth = 1.5,
  colorFrom = '#3b82f6',
  colorTo = '#1d4ed8',
  delay = 0,
}) => {
  return (
    <div
      className={cn('relative overflow-hidden rounded-lg', className)}
      style={{ '--border-width': `${borderWidth}px` } as React.CSSProperties}
    >
      {/* Animated border */}
      <motion.div
        className="absolute inset-0 rounded-lg"
        style={{
          background: `conic-gradient(from 0deg, ${colorFrom}, ${colorTo}, ${colorFrom})`,
          padding: `${borderWidth}px`,
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration,
          ease: 'linear',
          repeat: Infinity,
          delay,
        }}
      />
      
      {/* Content container */}
      <div className="relative bg-white dark:bg-gray-900 rounded-lg h-full w-full">
        {children}
      </div>
      
      {/* Mask for the beam effect */}
      <motion.div
        className="absolute inset-0 rounded-lg"
        style={{
          background: `conic-gradient(from 0deg, transparent 340deg, white 360deg)`,
          maskComposite: 'xor',
          WebkitMaskComposite: 'xor',
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration,
          ease: 'linear',
          repeat: Infinity,
          delay,
        }}
      />
    </div>
  );
};

export default BorderBeam;
