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
    filled: "bg-primary text-on-primary hover:opacity-90",
    tonal: "bg-secondary-container text-on-secondary-container hover:opacity-90",
    outlined: "border-2 border-outline text-primary hover:bg-surface-variant/20",
    text: "text-primary hover:bg-surface-variant/20"
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
      className={`p-3 rounded-2xl bg-surface-container-high border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary ${className}`}
      {...props}
    >
      {icon}
    </motion.button>
  );
};
