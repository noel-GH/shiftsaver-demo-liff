import React from 'react';
import { motion } from 'motion/react';

export const M3LoadingIndicator: React.FC<{ size?: number; color?: string }> = ({ 
  size = 40, 
  color = "stroke-primary" 
}) => {
  return (
    <div className="flex items-center justify-center p-4">
      <svg width={size} height={size} viewBox="0 0 50 50" className="animate-spin-slow">
        <motion.circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          strokeWidth="5"
          className={color}
          strokeLinecap="round"
          initial={{ pathLength: 0.2, rotate: 0 }}
          animate={{ 
            pathLength: [0.2, 0.8, 0.2],
            rotate: [0, 360]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        />
      </svg>
    </div>
  );
};

export const M3ProgressIndicator: React.FC<{ progress: number }> = ({ progress }) => {
  return (
    <div className="w-full h-2 bg-primary-container rounded-full overflow-hidden relative">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="h-full bg-primary rounded-full relative"
      >
        <motion.div
          animate={{ x: ['0%', '100%'], opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="absolute top-0 bottom-0 w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent"
        />
      </motion.div>
    </div>
  );
};
