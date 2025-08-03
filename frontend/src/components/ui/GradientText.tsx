import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  colors?: string[];
  animationSpeed?: number;
  showAnimation?: boolean;
}

const GradientText: React.FC<GradientTextProps> = ({
  children,
  className = '',
  colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'],
  animationSpeed = 3,
  showAnimation = true,
}) => {
  const gradientStyle = {
    backgroundImage: `linear-gradient(45deg, ${colors.join(', ')})`,
    backgroundSize: showAnimation ? '300% 300%' : '100% 100%',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    color: 'transparent',
    display: 'inline-block',
  };

  return (
    <motion.span
      className={cn('font-bold', className)}
      style={gradientStyle}
      animate={
        showAnimation
          ? {
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }
          : {}
      }
      transition={
        showAnimation
          ? {
              duration: animationSpeed,
              ease: 'linear',
              repeat: Infinity,
            }
          : {}
      }
    >
      {children}
    </motion.span>
  );
};

export default GradientText;
