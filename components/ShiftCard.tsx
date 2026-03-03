import React from 'react';
import { Shift, ShiftStatus } from '../types';
import { M3Button } from './ui/M3Button';
import { motion } from 'motion/react';
import { Clock, MapPin, AlertCircle, User as UserIcon, Trash2, Pencil, Megaphone } from 'lucide-react';
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
  onBroadcast?: (shift: Shift) => void;
}

export const ShiftCard: React.FC<ShiftCardProps> = ({ 
  shift, 
  isManager, 
  onAction, 
  actionLabel = "Action",
  onCancel,
  onEdit,
  onBroadcast
}) => {
  const isSurge = shift.current_pay_rate > shift.base_pay_rate;
  const isGhosted = shift.status === ShiftStatus.GHOSTED;
  const hasStaff = !!shift.user;

  // Logic การเลือก Card Style ตาม Material 3
  // 1. Elevated Card: สำหรับกะงานที่สร้างใหม่ หรือยังว่าง (Bidding/Scheduled แบบไม่มีคน)
  // 2. Filled Card: สำหรับกะงานที่มีคนรับแล้ว หรือสถานะวิกฤตที่ต้องเน้นเนื้อหา (Ghosted)
  const isFilledStyle = isGhosted || hasStaff;

  const canCancel = isManager && (
    shift.status === ShiftStatus.SCHEDULED || 
    shift.status === ShiftStatus.BIDDING || 
    shift.status === ShiftStatus.GHOSTED
  );
  
  const canEdit = isManager && (
    shift.status === ShiftStatus.BIDDING || 
    shift.status === ShiftStatus.SCHEDULED
  );

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative p-4 mb-4 rounded-[24px] transition-all duration-300
        ${isFilledStyle 
          ? 'bg-gray-100 border-transparent shadow-none' // --- M3 Filled Card ---
          : 'bg-white border border-gray-100 shadow-lg shadow-slate-900/5' // --- M3 Elevated Card ---
        }
        ${isGhosted ? 'ring-2 ring-google-red ring-inset bg-red-50/50' : ''} 
        active:scale-[0.98]
      `}
    >
      {/* Header Section */}
      <div className="flex justify-between items-start gap-3 mb-4">
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`font-bold text-lg leading-tight truncate ${isFilledStyle ? 'text-gray-800' : 'text-gray-900'}`}>
              {shift.role_required}
            </h3>
            {isSurge && (
              <span className="shrink-0 bg-google-red text-white text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                Surge
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-gray-500">
            <MapPin className="w-3.5 h-3.5 shrink-0 opacity-60" />
            <span className="text-[11px] font-bold uppercase tracking-widest truncate">
              {shift.location_name}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <Badge status={shift.status} />
          
          {/* Quick Actions for Manager */}
          <div className="flex items-center bg-white/50 backdrop-blur-sm rounded-full px-1 py-0.5 border border-gray-100">
            {isManager && (shift.status === ShiftStatus.BIDDING || shift.status === ShiftStatus.GHOSTED) && onBroadcast && (
              <button 
                onClick={(e) => { e.stopPropagation(); onBroadcast(shift); }}
                className="p-1.5 text-google-blue hover:bg-blue-50 rounded-full transition-colors"
                title="Broadcast"
              >
                <Megaphone className="w-4 h-4" />
              </button>
            )}
            {canEdit && onEdit && (
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit(shift); }}
                className="p-1.5 text-gray-400 hover:text-google-blue rounded-full transition-colors"
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {canCancel && onCancel && (
              <button 
                onClick={(e) => { e.stopPropagation(); onCancel(shift); }}
                className="p-1.5 text-gray-400 hover:text-google-red rounded-full transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2 text-gray-600">
          <div className={`p-2 rounded-xl ${isFilledStyle ? 'bg-white/60' : 'bg-gray-50'}`}>
            <Clock className="w-4 h-4 text-google-blue" />
          </div>
          <span className="text-sm font-bold">
            {format(new Date(shift.start_time), 'HH:mm')} - {format(new Date(shift.end_time), 'HH:mm')}
          </span>
        </div>
        
        <div className="text-right">
          <span className={`text-2xl font-black ${isSurge ? 'text-google-red' : 'text-google-navy-dark'}`}>
            ฿{shift.current_pay_rate?.toLocaleString()}
          </span>
          <span className="text-[10px] text-gray-400 ml-1 font-bold uppercase">/hr</span>
        </div>
      </div>

      {/* Staff Assignment Section */}
      {isManager && (
        <div className={`flex items-center gap-3 p-3 rounded-[16px] transition-colors ${isFilledStyle ? 'bg-white/40' : 'bg-gray-50'}`}>
          <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${hasStaff ? 'bg-google-blue text-white' : 'bg-gray-200 text-gray-400'}`}>
            <UserIcon className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Assignee</span>
            <span className={`text-xs truncate ${hasStaff ? 'font-bold text-gray-800' : 'italic text-gray-400'}`}>
              {hasStaff ? shift.user?.display_name : 'No one assigned yet'}
            </span>
          </div>
        </div>
      )}

      {/* Main Action Button */}
      {onAction && (
        <div className="mt-4">
          <M3Button
            onClick={() => onAction(shift)}
            variant={isGhosted ? 'filled' : 'tonal'}
            className={`w-full py-4 rounded-[18px] font-black text-sm tracking-wide ${
              isGhosted 
                ? 'bg-google-red hover:bg-red-700 shadow-lg shadow-red-200' 
                : 'shadow-sm'
            }`}
            icon={isGhosted ? <AlertCircle className="w-4 h-4" /> : undefined}
          >
            {actionLabel}
          </M3Button>
        </div>
      )}
    </motion.div>
  );
};