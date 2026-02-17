import React from 'react';
import { ShiftStatus } from '../types';

interface BadgeProps {
  status: ShiftStatus;
}

export const Badge: React.FC<BadgeProps> = ({ status }) => {
  const styles: Record<ShiftStatus, string> = {
    [ShiftStatus.SCHEDULED]: 'bg-blue-100 text-blue-800 border-blue-200',
    [ShiftStatus.CHECKED_IN]: 'bg-green-100 text-green-800 border-green-200',
    [ShiftStatus.COMPLETED]: 'bg-gray-100 text-gray-800 border-gray-200',
    [ShiftStatus.GHOSTED]: 'bg-red-100 text-red-800 border-red-200 animate-pulse',
    [ShiftStatus.BIDDING]: 'bg-orange-100 text-orange-800 border-orange-200',
    [ShiftStatus.FILLED]: 'bg-purple-100 text-purple-800 border-purple-200',
    [ShiftStatus.CANCELLED]: 'bg-gray-100 text-gray-500 border-gray-200',
  };

  const labels: Record<ShiftStatus, string> = {
    [ShiftStatus.SCHEDULED]: 'Scheduled',
    [ShiftStatus.CHECKED_IN]: 'Active Now',
    [ShiftStatus.COMPLETED]: 'Done',
    [ShiftStatus.GHOSTED]: 'NO SHOW',
    [ShiftStatus.BIDDING]: 'URGENT: OPEN',
    [ShiftStatus.FILLED]: 'Filled',
    [ShiftStatus.CANCELLED]: 'Cancelled',
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};