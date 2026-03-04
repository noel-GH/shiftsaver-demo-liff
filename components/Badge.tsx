import React from 'react';
import { ShiftStatus } from '../types';

interface BadgeProps {
  status: ShiftStatus | null;
}

export const Badge: React.FC<BadgeProps> = ({ status }) => {
  const styles: Record<ShiftStatus, string> = {
    [ShiftStatus.CREATED]: 'bg-blue-50 text-blue-600 border-blue-100',
    [ShiftStatus.SCHEDULED]: 'bg-google-blue/10 text-google-blue border-google-blue/20',
    [ShiftStatus.CHECKED_IN]: 'bg-google-green/10 text-google-green-dark border-google-green/20',
    [ShiftStatus.COMPLETED]: 'bg-gray-100 text-gray-800 border-gray-200',
    [ShiftStatus.GHOSTED]: 'bg-google-red/10 text-google-red-dark border-google-red/20 animate-pulse',
    [ShiftStatus.BIDDING]: 'bg-google-yellow/10 text-google-yellow-dark border-google-yellow/20',
    [ShiftStatus.FILLED]: 'bg-purple-100 text-purple-800 border-purple-200',
    [ShiftStatus.CANCELLED]: 'bg-gray-100 text-gray-500 border-gray-200',
  };

  const labels: Record<ShiftStatus, string> = {
    [ShiftStatus.CREATED]: 'Created',
    [ShiftStatus.SCHEDULED]: 'Scheduled',
    [ShiftStatus.CHECKED_IN]: 'Active Now',
    [ShiftStatus.COMPLETED]: 'Done',
    [ShiftStatus.GHOSTED]: 'NO SHOW',
    [ShiftStatus.BIDDING]: 'URGENT: OPEN',
    [ShiftStatus.FILLED]: 'Filled',
    [ShiftStatus.CANCELLED]: 'Cancelled',
  };

  if (status === null) {
    return (
      <span className="px-2.5 py-0.5 rounded-2xl text-xs font-bold border bg-gray-50 text-gray-400 border-gray-200">
        Draft
      </span>
    );
  }

  return (
    <span className={`px-2.5 py-0.5 rounded-2xl text-xs font-bold border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};