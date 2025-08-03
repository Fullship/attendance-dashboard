import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion';

interface NumberTickerProps {
  value: number;
  duration?: number;
  className?: string;
  direction?: 'up' | 'down';
  delay?: number;
}

const NumberTicker: React.FC<NumberTickerProps> = ({
  value,
  duration = 2,
  className = '',
  direction = 'up',
  delay = 0,
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(direction === 'down' ? value : 0);
  const springValue = useSpring(motionValue, {
    damping: 20,
    stiffness: 100,
  });
  const isInView = useInView(ref, { once: true, margin: '0px' });
  const [displayValue, setDisplayValue] = useState(direction === 'down' ? value : 0);

  useEffect(() => {
    springValue.on('change', (latest) => {
      setDisplayValue(Math.round(latest));
    });
  }, [springValue]);

  useEffect(() => {
    if (isInView) {
      setTimeout(() => {
        motionValue.set(direction === 'down' ? 0 : value);
      }, delay * 1000);
    }
  }, [motionValue, isInView, value, direction, delay]);

  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5, delay: delay }}
    >
      {displayValue}
    </motion.span>
  );
};

export default NumberTicker;
