import React from 'react';
import { motion, Variants } from 'framer-motion';

interface FadeInStaggerProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  staggerDelay?: number;
}

const FadeInStagger: React.FC<FadeInStaggerProps> = ({
  children,
  className = '',
  delay = 0,
  duration = 0.5,
  staggerDelay = 0.1,
}) => {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delay,
        staggerChildren: staggerDelay,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration,
        ease: "easeOut",
      },
    },
  };

  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {React.Children.map(children, (child, index) => (
        <motion.div key={index} variants={itemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};

export default FadeInStagger;
