import React from 'react';
import { motion } from 'motion/react';

interface M3ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'filled' | 'tonal' | 'outlined' | 'text';
  icon?: React.ReactNode;
  loading?: boolean;
}

export const M3Button: React.FC<M3ButtonProps> = ({ 
  children, 
  variant = 'filled', 
  icon, 
  loading, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "relative flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-colors overflow-hidden";
  
  const variants = {
    filled: "bg-indigo-600 text-white hover:bg-indigo-700",
    tonal: "bg-indigo-100 text-indigo-900 hover:bg-indigo-200",
    outlined: "border-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50",
    text: "text-indigo-600 hover:bg-indigo-50"
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.95, rotate: -1 }}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-5 h-5 border-2 border-current border-t-transparent rounded-full"
        />
      ) : (
        <>
          {icon && <span className="w-5 h-5">{icon}</span>}
          {children}
        </>
      )}
      
      {/* State Layer / Ripple Effect Simulation */}
      <motion.div
        className="absolute inset-0 bg-current opacity-0"
        whileTap={{ opacity: 0.1 }}
      />
    </motion.button>
  );
};

export const M3IconButton: React.FC<M3ButtonProps> = ({ icon, className = '', ...props }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.1, rotate: 5 }}
      whileTap={{ scale: 0.9, rotate: -5 }}
      transition={{ type: "spring", stiffness: 500, damping: 15 }}
      className={`p-3 rounded-2xl bg-white border border-gray-100 shadow-sm text-gray-600 hover:text-indigo-600 hover:border-indigo-100 ${className}`}
      {...props}
    >
      {icon}
    </motion.button>
  );
};
