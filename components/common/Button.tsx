
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'md', className = '', ...props }) => {
  const baseClasses = 'rounded-lg font-semibold transition-all duration-300 focus:outline-none focus-visible:ring-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform active:scale-95';

  const sizeClasses = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-2.5 text-sm',
    lg: 'px-8 py-3 text-base',
  };

  const variantClasses = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-300 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30',
    secondary: 'bg-orange-500 text-white hover:bg-orange-600 focus-visible:ring-orange-300 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30',
    outline: 'bg-transparent border-2 border-indigo-600 text-indigo-600 font-bold hover:bg-indigo-50 focus-visible:ring-indigo-300',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-indigo-600 focus-visible:ring-indigo-300'
  };

  return (
    <button className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;