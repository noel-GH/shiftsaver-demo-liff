import React from 'react';
import { motion } from 'motion/react';

interface M3ButtonGroupProps {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  className?: string;
}

export const M3ButtonGroup: React.FC<M3ButtonGroupProps> = ({ options, value, onChange, className = '' }) => {
  return (
    <div className={`flex bg-gray-100 p-1.5 rounded-[24px] relative ${className}`}>
      {options.map((option) => {
        const isActive = value === option;
        return (
          <button
            key={option}
            onClick={() => onChange(option)}
            className="flex-1 relative py-2.5 px-4 z-10"
          >
            {isActive && (
              <motion.div
                layoutId="active-pill"
                className="absolute inset-0 bg-white rounded-[20px] shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className={`relative z-20 text-xs font-bold transition-colors duration-200 ${
              isActive ? 'text-google-navy-dark' : 'text-gray-500'
            }`}>
              {option}
            </span>
          </button>
        );
      })}
    </div>
  );
};

interface M3SplitButtonProps {
  label: string;
  onClick: () => void;
  // คง menuItems ไว้แบบ Optional เพื่อไม่ให้เกิด Error ในไฟล์อื่นที่ส่งค่านี้มา
  menuItems?: Array<{ label: string; onClick: () => void }>;
}

export const M3SplitButton: React.FC<M3SplitButtonProps> = ({ label, onClick }) => {
  return (
    /* เอา w-full ออกจาก div ตรงนี้ เพื่อให้มันไม่ขยายเต็มพื้นที่ */
    <div className="relative flex w-full">
      <motion.button
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        /* เอา w-full ออก และเปลี่ยนเป็น rounded-full เพื่อให้ขอบมนสวยงาม */
        className="w-full flex items-center justify-center bg-google-navy-dark text-white px-6 py-4 rounded-full font-bold text-sm shadow-md hover:bg-opacity-90 transition-colors"
      >
        {label}
      </motion.button>
    </div>
  );
};