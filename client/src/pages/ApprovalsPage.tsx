import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Skeleton,
  Textarea,
} from '@databricks/appkit-ui/react';
import { Check, CheckCheck, ShieldX, X } from 'lucide-react';
import { useSession } from '../lib/session';
import { decideRequest, listPendingRequests } from '../lib/api';
import type { TastingRequest } from '../../../shared/schema';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{value || '—'}</dd>
    </div>
  );
}

function PendingCard({
  request,
  onResolved,
}: {
  request: TastingRequest;
  onResolved: () => void;
}) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const s1 = request.section1;

  async function act(decision: 'approve' | 'reject') {
    setBusy(true);
    setError(null);
    try {
      await decideRequest(request.id, { decision, note });
      onResolved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
      setBusy(false);
    }
  }

  const profile =
    s1.participantProfile === 'Other' && s1.participantProfileOther
      ? `Other: ${s1.participantProfileOther}`
      : s1.participantProfile;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">
            {s1.eventName}{' '}
            <span className="font-mono text-xs text-muted-foreground">
              {request.reference}
            </span>
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {request.requesterEmail}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <DetailRow label="Requester" value={s1.requesterName} />
          <DetailRow label="Request type" value={s1.requestType} />
          <DetailRow label="Cost center" value={s1.costCenter} />
          <DetailRow label="Date(s)" value={s1.eventDates} />
          <DetailRow label="Time(s)" value={s1.eventTimes} />
          <DetailRow label="Location" value={s1.eventLocation} />
          <DetailRow label="Participants" value={s1.numParticipants} />
          <DetailRow label="Profile" value={profile} />
          <DetailRow label="Markets" value={s1.participantCountries} />
        </dl>

        {error ? (
          <Alert className="border-destructive text-destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note to the requester (reason, conditions, etc.)"
          rows={2}
        />

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => void act('approve')}
            disabled={busy}
            className="gap-2 bg-success text-success-foreground hover:bg-success/90"
          >
            <Check className="h-4 w-4" />
            Approve
          </Button>
          <Button
            onClick={() => void act('reject')}
            disabled={busy}
            variant="outline"
            className="gap-2 border-destructive text-destructive hover:bg-destructive/10"
          >
            <X className="h-4 w-4" />
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ApprovalsPage() {
  const { whoami, loading: sessionLoading } = useSession();
  const [requests, setRequests] = useState<TastingRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reload used by event handlers (after approve/reject); resets to the
  // skeleton state before refetching.
  const load = useCallback(() => {
    setRequests(null);
    setError(null);
    listPendingRequests()
      .then(setRequests)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load'),
      );
  }, []);

  // Initial load / reload when the identity changes. State is only updated
  // inside the async callbacks to avoid a synchronous set-state in the effect.
  useEffect(() => {
    if (!whoami?.isApprover) return;
    let active = true;
    listPendingRequests()
      .then((data) => {
        if (active) setRequests(data);
      })
      .catch((err) => {
        if (active)
          setError(err instanceof Error ? err.message : 'Failed to load');
      });
    return () => {
      active = false;
    };
  }, [whoami]);

  if (sessionLoading) {
    return (
      <div className="max-w-3xl mx-auto">
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!whoami?.isApprover) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <Alert>
          <ShieldX className="h-4 w-4" />
          <AlertTitle>Approvals are restricted</AlertTitle>
          <AlertDescription>
            Only designated approvers can review requests. If you should have
            access, ask an administrator to add your email to the approver list.{' '}
            <Link to="/my" className="underline">
              Go to my requests
            </Link>
            .
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Approvals</h2>
        <p className="text-muted-foreground mt-1">
          Review Section 1 submissions awaiting your decision. Approving unlocks
          Section 2 for the requester.
        </p>
      </div>

      {error ? (
        <Alert className="border-destructive text-destructive">
          <AlertTitle>Could not load approvals</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!requests && !error ? (
        <div className="space-y-3">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : null}

      {requests && requests.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <CheckCheck className="h-10 w-10 text-success" />
            <EmptyTitle>All caught up</EmptyTitle>
            <EmptyDescription>
              There are no requests awaiting approval right now.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      {requests && requests.length > 0 ? (
        <div className="space-y-4">
          {requests.map((r) => (
            <PendingCard key={r.id} request={r} onResolved={load} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
