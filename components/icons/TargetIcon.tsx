
import React from 'react';

export const TargetIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75v-1.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75v-1.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m17.25 12-1.5 0" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 12-1.5 0" />
    </svg>
);
