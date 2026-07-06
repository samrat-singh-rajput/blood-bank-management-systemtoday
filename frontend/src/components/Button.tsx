
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  isLoading, 
  disabled,
  ...props 
}) => {
  const baseStyles = "px-6 py-2.5 rounded-xl font-bold transition-all duration-300 flex items-center justify-center transform active:scale-95 disabled:opacity-50 disabled:active:scale-100";
  
  const variants = {
    primary: "bg-blood-600 text-white hover:bg-blood-700 shadow-lg hover:shadow-blood-600/40 hover:-translate-y-0.5 border-b-2 border-blood-800 hover:border-blood-900",
    secondary: "bg-gray-800 text-white hover:bg-gray-900 shadow-md hover:-translate-y-0.5 border-b-2 border-black",
    outline: "border-2 border-blood-600 text-blood-600 hover:bg-blood-50 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blood-600/10",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-lg hover:shadow-red-500/40 hover:-translate-y-0.5 border-b-2 border-red-700",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className} ${isLoading ? 'cursor-wait' : ''}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : null}
      <span className="flex items-center gap-2">
        {children}
      </span>
    </button>
  );
};
