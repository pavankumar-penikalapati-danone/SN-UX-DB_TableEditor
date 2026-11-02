import { Badge } from '@databricks/appkit-ui/react';
import { CheckCircle2, Clock, FileEdit, XCircle } from 'lucide-react';
import type { RequestStatus } from '../../../shared/schema';
import { STATUS_LABELS } from '../../../shared/schema';

const STYLES: Record<RequestStatus, { className: string; Icon: typeof Clock }> = {
  PENDING_APPROVAL: {
    className: 'bg-warning text-warning-foreground',
    Icon: Clock,
  },
  APPROVED_AWAITING_SECTION2: {
    className: 'bg-primary text-primary-foreground',
    Icon: FileEdit,
  },
  SECTION2_SUBMITTED: {
    className: 'bg-success text-success-foreground',
    Icon: CheckCircle2,
  },
  REJECTED: {
    className: 'bg-destructive text-destructive-foreground',
    Icon: XCircle,
  },
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  const { className, Icon } = STYLES[status];
  return (
    <Badge className={`gap-1 ${className}`}>
      <Icon className="h-3.5 w-3.5" />
      {STATUS_LABELS[status]}
    </Badge>
  );
}
