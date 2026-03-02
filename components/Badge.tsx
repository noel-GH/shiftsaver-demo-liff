import React from 'react';
import { ShiftStatus } from '../types';

interface BadgeProps {
  status: ShiftStatus;
}

export const Badge: React.FC<BadgeProps> = ({ status }) => {
  const styles: Record<ShiftStatus, string> = {
    [ShiftStatus.SCHEDULED]: 'bg-primary-container text-on-primary-container border-primary-container',
    [ShiftStatus.CHECKED_IN]: 'bg-tertiary-container text-on-tertiary-container border-tertiary-container',
    [ShiftStatus.COMPLETED]: 'bg-surface-variant text-on-surface-variant border-outline-variant',
    [ShiftStatus.GHOSTED]: 'bg-error-container text-on-error-container border-error animate-pulse',
    [ShiftStatus.BIDDING]: 'bg-secondary-container text-on-secondary-container border-secondary-container',
    [ShiftStatus.FILLED]: 'bg-primary-container text-on-primary-container border-primary-container',
    [ShiftStatus.CANCELLED]: 'bg-surface-variant text-on-surface-variant border-outline-variant opacity-50',
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
    <span className={`px-2.5 py-0.5 rounded-2xl text-xs font-bold border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};