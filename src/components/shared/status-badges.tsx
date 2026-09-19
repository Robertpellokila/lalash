import { cn } from '@/lib/utils';
import type { BookingStatus, PaymentStatus } from '@/lib/types';

const statusConfig: Record<BookingStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'status-pending' },
  CONFIRMED: { label: 'Confirmed', className: 'status-confirmed' },
  ARRIVED: { label: 'Arrived', className: 'status-arrived' },
  IN_PROGRESS: { label: 'In Progress', className: 'status-in-progress' },
  COMPLETED: { label: 'Completed', className: 'status-completed' },
  CANCELLED: { label: 'Cancelled', className: 'status-cancelled' },
  NO_SHOW: { label: 'No Show', className: 'status-no-show' },
};

const paymentConfig: Record<PaymentStatus, { label: string; className: string }> = {
  UNPAID: { label: 'Unpaid', className: 'payment-unpaid' },
  DP: { label: 'DP', className: 'payment-dp' },
  PAID: { label: 'Paid', className: 'payment-paid' },
  REFUNDED: { label: 'Refunded', className: 'payment-refunded' },
};

export function StatusBadge({
  status,
  className,
}: {
  status: BookingStatus;
  className?: string;
}) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}

export function PaymentBadge({
  status,
  className,
}: {
  status: PaymentStatus;
  className?: string;
}) {
  const config = paymentConfig[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
