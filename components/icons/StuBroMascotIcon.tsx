import React from 'react';

export const StuBroMascotIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g transform="translate(0, -5)">
      {/* Head */}
      <circle cx="50" cy="55" r="40" fill="#E0E7FF" stroke="#4F46E5" strokeWidth="4"/>
      {/* Eyes */}
      <circle cx="35" cy="50" r="6" fill="#4F46E5"/>
      <circle cx="65" cy="50" r="6" fill="#4F46E5"/>
      {/* Smile */}
      <path d="M 35 68 Q 50 80 65 68" stroke="#4F46E5" strokeWidth="4" fill="none" strokeLinecap="round"/>
      {/* Antenna */}
      <line x1="50" y1="15" x2="50" y2="5" stroke="#4F46E5" strokeWidth="4" strokeLinecap="round"/>
      <circle cx="50" cy="5" r="5" fill="#F97316"/>
    </g>
  </svg>
);
