
import React from 'react';

const Spinner: React.FC<{ className?: string, colorClass?: string }> = ({ className = 'h-5 w-5', colorClass='bg-cyan-400' }) => {
  return (
    <div className={`pulsing-loader flex items-center justify-center space-x-1.5 ${className}`} role="status">
      <div className={`h-2 w-2 rounded-full ${colorClass}`}></div>
      <div className={`h-2 w-2 rounded-full ${colorClass}`}></div>
      <div className={`h-2 w-2 rounded-full ${colorClass}`}></div>
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default Spinner;
