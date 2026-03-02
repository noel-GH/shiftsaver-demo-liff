import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, AlertTriangle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const icons = {
    success: <Check className="w-5 h-5 text-gray-900" />,
    error: <X className="w-5 h-5 text-rose-600" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600" />,
    info: <Info className="w-5 h-5 text-blue-600" />,
  };

  const bgColors = {
    success: 'bg-[#EADDFF]',
    error: 'bg-[#F9DEDC]',
    warning: 'bg-[#FEF3E8]',
    info: 'bg-[#E8F0FE]',
  };

  const defaultSubtitles = {
    success: 'ดำเนินการเสร็จสิ้นเรียบร้อย',
    error: 'เกิดข้อผิดพลาด กรุณาลองใหม่',
    warning: 'โปรดตรวจสอบความถูกต้อง',
    info: 'ข้อมูลเพิ่มเติมสำหรับคุณ',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      exit={{ opacity: 0, y: 20, x: '-50%', transition: { duration: 0.2 } }}
      className={`fixed bottom-10 left-1/2 z-[100] flex items-center gap-4 px-4 py-4 rounded-2xl shadow-xl ${bgColors[type]} w-[calc(100%-40px)] max-w-[400px] border border-white/20 backdrop-blur-sm`}
    >
      <div className="shrink-0 bg-white rounded-2xl p-2 shadow-sm flex items-center justify-center">
        {icons[type]}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-[14px] font-bold text-gray-900 leading-tight">
          {message.replace(/^[✅❌⚠️📢🗑]\s*/, '')}
        </h4>
        <p className="text-[12px] text-gray-600 mt-0.5 leading-tight">
          {defaultSubtitles[type]}
        </p>
      </div>
      <button 
        onClick={onClose}
        className="shrink-0 p-1 hover:bg-black/5 rounded-none transition-colors text-gray-400"
      >
        <X className="w-5 h-5" />
      </button>
    </motion.div>
  );
};
