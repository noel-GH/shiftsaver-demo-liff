import React, { useRef } from 'react';
import { Shift, ShiftStatus } from '../types';
import { M3Button } from './ui/M3Button';
import { motion, useMotionValue, useTransform, useAnimationControls } from 'motion/react';
import { Clock, MapPin, AlertCircle, User as UserIcon, Trash2, Pencil, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from './Badge';

interface ShiftCardProps {
  shift: Shift;
  isManager: boolean;
  onAction?: (shift: Shift) => void;
  actionLabel?: string;
  actionColor?: string;
  onCancel?: (shift: Shift) => void;
  onEdit?: (shift: Shift) => void;
}

export const ShiftCard: React.FC<ShiftCardProps> = ({ 
  shift, 
  isManager, 
  onAction, 
  actionLabel = "Action",
  onCancel,
  onEdit
}) => {
  const isSurge = shift.current_pay_rate > shift.base_pay_rate;
  const canCancel = isManager && (shift.status === ShiftStatus.SCHEDULED || shift.status === ShiftStatus.BIDDING || shift.status === ShiftStatus.GHOSTED);
  const canEdit = isManager && (shift.status === ShiftStatus.BIDDING || shift.status === ShiftStatus.SCHEDULED);
  
  const x = useMotionValue(0);
  const controls = useAnimationControls();
  const cardRef = useRef<HTMLDivElement>(null);

  // Background colors and icons based on swipe direction
  const bgRightColor = isManager ? 'bg-red-700' : 'bg-lime-800';
  const bgLeftColor = 'bg-stone-500';

  // Opacity and scale transforms for icons
  const rightIconOpacity = useTransform(x, [0, 50], [0, 1]);
  const rightIconScale = useTransform(x, [0, 50], [0.5, 1]);
  const leftIconOpacity = useTransform(x, [-50, 0], [1, 0]);
  const leftIconScale = useTransform(x, [-50, 0], [1, 0.5]);

  const handleDragEnd = async (_: any, info: any) => {
    const width = cardRef.current?.offsetWidth || 0;
    const threshold = width * 0.3;

    if (info.offset.x > threshold) {
      // Swipe Right Action
      if (isManager && canCancel && onCancel) {
        await controls.start({ x: width, opacity: 0 });
        onCancel(shift);
      } else if (!isManager && onAction) {
        await controls.start({ x: width, opacity: 0 });
        onAction(shift);
      } else {
        controls.start({ x: 0 });
      }
    } else if (info.offset.x < -threshold && isManager && canEdit && onEdit) {
      // Swipe Left Action (Manager Only)
      await controls.start({ x: -width, opacity: 0 });
      onEdit(shift);
      // Reset after a short delay if it's an edit (usually opens a modal)
      setTimeout(() => controls.start({ x: 0, opacity: 1 }), 500);
    } else {
      // Snap back
      controls.start({ x: 0 });
    }
  };

  return (
    <div className="relative mb-4 overflow-hidden rounded-[16px]" ref={cardRef}>
      {/* Background Layer (Revealed on Swipe) */}
      <div className="absolute inset-0 flex items-center justify-between">
        {/* Swipe Right Background */}
        <motion.div 
          style={{ opacity: rightIconOpacity }}
          className={`absolute inset-0 flex items-center justify-start px-6 ${bgRightColor}`}
        >
          <motion.div style={{ scale: rightIconScale }} className="flex items-center gap-3 text-white">
            {isManager ? <Trash2 className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
            <span className="font-bold uppercase tracking-widest text-xs">
              {isManager ? 'Delete' : actionLabel}
            </span>
          </motion.div>
        </motion.div>

        {/* Swipe Left Background (Manager Only) */}
        {isManager && (
          <motion.div 
            style={{ opacity: leftIconOpacity }}
            className={`absolute inset-0 flex items-center justify-end px-6 ${bgLeftColor}`}
          >
            <motion.div style={{ scale: leftIconScale }} className="flex items-center gap-3 text-white">
              <span className="font-bold uppercase tracking-widest text-xs">Edit</span>
              <Pencil className="w-6 h-6" />
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* Main Card Content */}
      <motion.div 
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: isManager ? -1000 : 0, right: 1000 }}
        dragElastic={0.1}
        animate={controls}
        style={{ x }}
        onDragEnd={handleDragEnd}
        className={`relative bg-surface-container-low rounded-[16px] border p-4 transition-shadow active:shadow-lg z-10 cursor-grab active:cursor-grabbing ${
          shift.status === ShiftStatus.GHOSTED 
            ? 'border-error bg-error-container/10' 
            : isSurge 
              ? 'border-tertiary bg-tertiary-container/10' 
              : 'border-outline-variant'
        }`}
      >
        {/* Header Row */}
        <div className="flex justify-between items-start gap-2 mb-3">
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
               <h3 className="font-bold text-on-surface text-lg leading-tight break-words flex-1">
                  {shift.role_required}
               </h3>
                {isSurge && <span className="shrink-0 bg-tertiary text-on-tertiary text-[9px] px-1.5 py-0.5 rounded-lg font-bold uppercase tracking-wider">Surge</span>}
            </div>
            <span className="text-on-surface-variant text-[11px] font-semibold uppercase tracking-wider truncate">{shift.location_name}</span>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Badge status={shift.status} />
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm text-on-surface-variant mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="w-4 h-4 text-on-surface-variant shrink-0" />
            <span className="truncate">
              {format(new Date(shift.start_time), 'HH:mm')} - {format(new Date(shift.end_time), 'HH:mm')}
            </span>
          </div>
          
          <div className="flex items-center justify-end gap-1.5 min-w-0">
            <span className={`font-bold text-lg leading-none ${isSurge ? 'text-tertiary' : 'text-on-surface'}`}>
              ฿{shift.current_pay_rate?.toLocaleString()}
            </span>
            <span className="text-[10px] text-on-surface-variant font-medium">/ชม.</span>
          </div>

          {isManager && (
              <div className="flex items-center gap-2 col-span-2 pt-1 border-t border-outline-variant/30">
                  <UserIcon className="w-3.5 h-3.5 text-on-surface-variant shrink-0" />
                  <span className={`text-xs truncate ${shift.user ? 'text-on-surface font-medium' : 'text-on-surface-variant italic'}`}>
                      {shift.user ? shift.user.display_name : 'ยังไม่มีผู้รับงาน (Open)'}
                  </span>
              </div>
          )}
        </div>

        {/* Action Area (Optional, since we have swipe) */}
        {onAction && (
          <div className="mt-2 pt-3 border-t border-outline-variant/30 flex justify-end">
            <M3Button
              onClick={() => onAction(shift)}
              variant={shift.status === ShiftStatus.GHOSTED ? 'filled' : 'tonal'}
              className={`w-full ${shift.status === ShiftStatus.GHOSTED ? 'bg-error text-on-error hover:bg-error/90' : ''}`}
              icon={shift.status === ShiftStatus.GHOSTED ? <AlertCircle className="w-4 h-4" /> : null}
            >
              {actionLabel}
            </M3Button>
          </div>
        )}
      </motion.div>
    </div>
  );
};