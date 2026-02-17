import React from 'react';
import { Shift, ShiftStatus } from '../types';
import { Badge } from './Badge';
import { Clock, MapPin, DollarSign, AlertCircle, User as UserIcon } from 'lucide-react';
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
    <div className={`relative bg-white rounded-xl shadow-sm border-l-4 p-4 mb-4 transition-all hover:shadow-md ${shift.status === ShiftStatus.GHOSTED ? 'border-red-500' : isSurge ? 'border-orange-500' : 'border-gray-200'}`}>
      
      {/* Header Row */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col">
          <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
             {shift.role_required}
             {isSurge && <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider">Surge Pay</span>}
          </h3>
          <span className="text-gray-500 text-xs font-medium uppercase tracking-wide">{shift.location_name}</span>
        </div>
        <Badge status={shift.status} />
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm text-gray-600 mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <span>
            {format(new Date(shift.start_time), 'HH:mm')} - {format(new Date(shift.end_time), 'HH:mm')}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <DollarSign className={`w-4 h-4 ${isSurge ? 'text-orange-500' : 'text-gray-400'}`} />
          <span className={isSurge ? 'font-bold text-orange-600' : ''}>
            ${shift.current_pay_rate.toFixed(2)}/hr
          </span>
        </div>

        {isManager && (
            <div className="flex items-center gap-2 col-span-2">
                <UserIcon className="w-4 h-4 text-gray-400" />
                <span className={shift.user ? 'text-gray-900 font-medium' : 'text-gray-400 italic'}>
                    {shift.user ? shift.user.display_name : 'Unassigned'}
                </span>
            </div>
        )}
      </div>

      {/* Action Area */}
      {onAction && (
        <div className="mt-2 pt-3 border-t border-gray-100 flex justify-end">
          <button
            onClick={() => onAction(shift)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white font-semibold text-sm shadow-sm transition-colors ${actionColor}`}
          >
            {shift.status === ShiftStatus.GHOSTED ? <AlertCircle className="w-4 h-4" /> : null}
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
};