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
    filled: "bg-google-blue text-white hover:bg-opacity-90",
    tonal: "bg-blue-50 text-google-blue hover:bg-blue-100",
    outlined: "border-2 border-gray-200 text-google-blue hover:bg-gray-50",
    text: "text-google-blue hover:bg-gray-50"
  };

  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
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
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
      className={`p-3 rounded-2xl bg-white border border-gray-100 shadow-sm text-gray-600 hover:text-google-navy-dark hover:border-gray-200 ${className}`}
      {...props}
    >
      {icon}
    </motion.button>
  );
};
