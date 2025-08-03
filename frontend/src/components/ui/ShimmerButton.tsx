import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/utils';

interface ShimmerButtonProps extends Omit<HTMLMotionProps<"button">, 'children'> {
  children: React.ReactNode;
  className?: string;
  shimmerColor?: string;
  background?: string;
}

const ShimmerButton: React.FC<ShimmerButtonProps> = ({
  children,
  className = '',
  shimmerColor = 'rgba(255, 255, 255, 0.5)',
  background = 'linear-gradient(45deg, #3b82f6, #1d4ed8)',
  ...props
}) => {
  return (
    <motion.button
      className={cn(
        'relative overflow-hidden rounded-md px-6 py-2 font-medium text-white transition-all duration-300',
        'hover:scale-105 active:scale-95',
        className
      )}
      style={{ background }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      
      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0 -skew-x-12"
        initial={{ x: '-100%' }}
        whileHover={{
          x: '200%',
          transition: {
            duration: 0.6,
            ease: 'easeInOut',
          },
        }}
        style={{
          background: `linear-gradient(90deg, transparent, ${shimmerColor}, transparent)`,
        }}
      />
      
      {/* Background glow */}
      <motion.div
        className="absolute inset-0 rounded-md opacity-0"
        whileHover={{ opacity: 0.2 }}
        style={{
          background: 'radial-gradient(circle at center, white, transparent)',
        }}
      />
    </motion.button>
  );
};

export default ShimmerButton;
