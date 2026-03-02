import React from 'react';
import { motion } from 'motion/react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface M3NavigationBarProps {
  items: NavItem[];
  activeId: string;
  onChange: (id: string) => void;
}

export const M3NavigationBar: React.FC<M3NavigationBarProps> = ({ items, activeId, onChange }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface-container border-t border-outline-variant px-6 pt-3 pb-8 flex justify-around items-center z-40 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] rounded-t-[32px]">
      {items.map((item) => {
        const isActive = activeId === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className="relative flex flex-col items-center gap-1 group"
          >
            <div className="relative p-2 px-6 rounded-2xl transition-colors">
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute inset-0 bg-secondary-container rounded-2xl"
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                />
              )}
              <motion.div
                animate={{ 
                  scale: isActive ? 1.2 : 1,
                  y: isActive ? -2 : 0
                }}
                className={`relative z-10 ${isActive ? 'text-on-secondary-container' : 'text-on-surface-variant group-hover:text-on-surface'}`}
              >
                {item.icon}
              </motion.div>
            </div>
            <span className={`text-[10px] font-bold tracking-wider uppercase transition-colors ${isActive ? 'text-on-surface' : 'text-on-surface-variant'}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export const M3NavigationRail: React.FC<M3NavigationBarProps> = ({ items, activeId, onChange }) => {
  return (
    <nav className="fixed left-0 top-0 bottom-0 w-20 bg-white border-r border-gray-100 py-8 flex flex-col items-center gap-8 z-40">
      {items.map((item) => {
        const isActive = activeId === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className="relative flex flex-col items-center gap-1 group"
          >
            <div className="relative p-3 rounded-2xl transition-colors">
              {isActive && (
                <motion.div
                  layoutId="rail-indicator"
                  className="absolute inset-0 bg-indigo-100 rounded-2xl"
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                />
              )}
              <motion.div
                animate={{ 
                  scale: isActive ? 1.2 : 1,
                  x: isActive ? 2 : 0
                }}
                className={`relative z-10 ${isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`}
              >
                {item.icon}
              </motion.div>
            </div>
            <span className="text-[9px] font-bold tracking-tighter uppercase text-gray-400 group-hover:text-gray-600">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
