import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';

interface M3AppBarProps {
  title: string;
  subtitle?: string;
  leftAction?: React.ReactNode;
  rightActions?: React.ReactNode;
}

export const M3AppBar: React.FC<M3AppBarProps> = ({ title, subtitle, leftAction, rightActions }) => {
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    return scrollY.on("change", (latest) => {
      setIsScrolled(latest > 20);
    });
  }, [scrollY]);

  const headerHeight = useTransform(scrollY, [0, 100], [120, 80]);
  const titleScale = useTransform(scrollY, [0, 100], [1, 0.9]);
  const titleY = useTransform(scrollY, [0, 100], [0, -5]);

  return (
    <motion.header
      style={{ height: headerHeight }}
      className={`fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-b transition-all duration-500 ${
        isScrolled ? 'border-gray-200 shadow-sm rounded-b-[32px]' : 'border-transparent'
      }`}
    >
      <div className="max-w-4xl mx-auto h-full px-8 flex items-center justify-between relative">
        <div className="flex items-center gap-4">
          {leftAction && (
            <motion.div whileTap={{ scale: 0.9 }}>
              {leftAction}
            </motion.div>
          )}
          <motion.div style={{ scale: titleScale, y: titleY }}>
            <h1 className="text-2xl font-black text-google-navy-dark leading-tight">{title}</h1>
            {subtitle && (
              <p className="text-[11px] text-google-green/70 font-bold uppercase tracking-widest mt-0.5">
                {subtitle}
              </p>
            )}
          </motion.div>
        </div>
        
        <div className="flex items-center gap-2">
          {rightActions}
        </div>
      </div>
    </motion.header>
  );
};

export const M3Toolbar: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-24 left-4 right-4 z-30 bg-gray-900/95 backdrop-blur-md text-white p-2 rounded-3xl shadow-2xl flex items-center justify-around border border-gray-700"
    >
      {children}
    </motion.div>
  );
};
