
import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'light';
}

const Card: React.FC<CardProps> = ({ children, className = '', variant, ...props }) => {
  const baseClasses = `rounded-2xl p-6 transition-all duration-300 bg-white/70 backdrop-blur-md border border-gray-200/80 shadow-lg`;

  return (
    <div className={`${baseClasses} ${className}`} {...props}>
      {children}
    </div>
  );
};

export default Card;
