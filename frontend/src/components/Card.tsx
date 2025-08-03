import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string | React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  title, 
  subtitle, 
  action 
}) => {
  return (
    <div className={`card p-6 ${className}`}>
      {(title || subtitle || action) && (
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
