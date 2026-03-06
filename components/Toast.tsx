import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
// ลบ X ออกจาก import เพราะไม่ได้ใช้แล้ว
import { Check, AlertTriangle, Info } from 'lucide-react';

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
    // แก้ไข: เปลี่ยน error จาก <X /> เป็น <AlertTriangle />
    error: <AlertTriangle className="w-5 h-5 text-amber-600" />,
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
      // ลบ items-center ออก เพื่อให้ Icon กับข้อความจัดชิดบน (Top align) เหมือนในรูปตัวอย่าง
      className={`fixed bottom-10 left-1/2 z-[100] flex gap-4 px-4 py-4 rounded-2xl shadow-xl ${bgColors[type]} w-[calc(100%-40px)] max-w-[400px] border border-white/20 backdrop-blur-sm`}
    >
      {/* เพิ่ม p-1.5 shadow-sm เพื่อให้วงกลมสีขาวรอบ Icon ดูดีขึ้น */}
      <div className="shrink-0 bg-white rounded-full p-1.5 shadow-sm flex items-center justify-center w-10 h-10">
        {icons[type]}
      </div>
      <div className="flex-1 min-w-0 pt-0.5"> {/* เพิ่ม pt-0.5 เพื่อจัดระเบียบข้อความนิดหน่อย */}
        <h4 className="text-[14px] font-bold text-gray-900 leading-tight">
          {message.replace(/^[✅❌⚠️📢🗑]\s*/, '')}
        </h4>
        <p className="text-[12px] text-gray-600 mt-1 leading-tight">
          {defaultSubtitles[type]}
        </p>
      </div>
      {/* --- ลบปุ่มปิด (Close Button) ส่วนนี้ออกแล้ว --- */}
    </motion.div>
  );
};