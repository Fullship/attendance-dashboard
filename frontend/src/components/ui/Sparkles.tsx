import React from 'react';
import { motion } from 'framer-motion';

interface SparklesProps {
  children: React.ReactNode;
  className?: string;
  sparkleCount?: number;
}

const Sparkles: React.FC<SparklesProps> = ({ 
  children, 
  className = '', 
  sparkleCount = 8 
}) => {
  const sparkles = Array.from({ length: sparkleCount }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    delay: Math.random() * 2,
  }));

  return (
    <div className={`relative inline-block ${className}`}>
      {sparkles.map((sparkle) => (
        <motion.div
          key={sparkle.id}
          className="absolute pointer-events-none"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            width: sparkle.size,
            height: sparkle.size,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 2,
            delay: sparkle.delay,
            repeat: Infinity,
            repeatDelay: Math.random() * 3 + 2,
          }}
        >
          <svg
            width={sparkle.size}
            height={sparkle.size}
            viewBox="0 0 24 24"
            fill="none"
            className="text-yellow-400"
          >
            <path
              d="M12 0L14.09 8.26L22 10L14.09 11.74L12 20L9.91 11.74L2 10L9.91 8.26L12 0Z"
              fill="currentColor"
            />
          </svg>
        </motion.div>
      ))}
      {children}
    </div>
  );
};

export default Sparkles;
