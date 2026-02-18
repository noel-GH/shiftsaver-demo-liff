import React from 'react';
import { Shift, ShiftStatus } from '../types';
import { Badge } from './Badge';
import { Clock, MapPin, AlertCircle, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';

interface ShiftCardProps {
  shift: Shift;
  isManager: boolean;
  onAction?: (shift: Shift) => void;
  actionLabel?: string;
  actionColor?: string;
}

export const ShiftCard: React.FC<ShiftCardProps> = ({ 
  shift, 
  isManager, 
  onAction, 
  actionLabel = "Action",
  actionColor = "bg-blue-600 hover:bg-blue-700"
}) => {
  const isSurge = shift.current_pay_rate > shift.base_pay_rate;

  return (
    <div className={`relative bg-white rounded-2xl shadow-sm border-l-4 p-4 mb-4 transition-all active:scale-[0.98] ${shift.status === ShiftStatus.GHOSTED ? 'border-red-500' : isSurge ? 'border-orange-500' : 'border-gray-200'}`}>
      
      {/* Header Row */}
      <div className="flex justify-between items-start gap-2 mb-3">
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
             <h3 className="font-bold text-gray-900 text-lg leading-tight break-words flex-1">
                {shift.role_required}
             </h3>
             {isSurge && <span className="shrink-0 bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Surge</span>}
          </div>
          <span className="text-gray-500 text-[11px] font-semibold uppercase tracking-wider truncate">{shift.location_name}</span>
        </div>
        <div className="shrink-0">
          <Badge status={shift.status} />
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="truncate">
            {format(new Date(shift.start_time), 'HH:mm')} - {format(new Date(shift.end_time), 'HH:mm')}
          </span>
        </div>
        
        <div className="flex items-center justify-end gap-1.5 min-w-0">
          <span className={`font-bold text-lg leading-none ${isSurge ? 'text-orange-600' : 'text-gray-900'}`}>
            ฿{shift.current_pay_rate.toLocaleString()}
          </span>
          <span className="text-[10px] text-gray-400 font-medium">/ชม.</span>
        </div>

        {isManager && (
            <div className="flex items-center gap-2 col-span-2 pt-1 border-t border-gray-50">
                <UserIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className={`text-xs truncate ${shift.user ? 'text-gray-700 font-medium' : 'text-gray-400 italic'}`}>
                    {shift.user ? shift.user.display_name : 'ยังไม่มีผู้รับงาน'}
                </span>
            </div>
        )}
      </div>

      {/* Action Area */}
      {onAction && (
        <div className="mt-2 pt-3 border-t border-gray-100 flex justify-end">
          <button
            onClick={() => onAction(shift)}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-sm shadow-sm transition-colors ${actionColor}`}
          >
            {shift.status === ShiftStatus.GHOSTED ? <AlertCircle className="w-4 h-4" /> : null}
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
};