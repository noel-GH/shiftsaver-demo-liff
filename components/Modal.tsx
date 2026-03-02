import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  noPadding?: boolean;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, noPadding }) => {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          {/* Swipe Up Card */}
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative bg-white opacity-100 rounded-t-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[92vh]"
          >

            <div className="flex justify-between items-center p-4 border-b border-gray-100 relative bg-white">
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-2xl transition-colors z-10 outline-none">
                <X className="w-5 h-5 text-gray-500" />
              </button>
              <h3 className="font-bold text-lg text-gray-900 absolute left-1/2 transform -translate-x-1/2">{title}</h3>
              <div className="w-9"></div> {/* Spacer to balance the close button */}
            </div>

            <div className={`overflow-y-auto flex-1 ${noPadding ? '' : 'p-6'}`}>
              {children}
            </div>

            {footer && (
              <div className="bg-white p-4 flex justify-end gap-3 border-t border-gray-100 relative z-20">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};