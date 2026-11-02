import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Skeleton,
} from '@databricks/appkit-ui/react';
import { ArrowRight, FileEdit, FilePlus2, Inbox } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { listMyRequests } from '../lib/api';
import type { TastingRequest } from '../../../shared/schema';

export function MyRequestsPage() {
  const [requests, setRequests] = useState<TastingRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMyRequests()
      .then(setRequests)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load'),
      );
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">My requests</h2>
          <p className="text-muted-foreground mt-1">
            Track the status of your tasting-session requests.
          </p>
        </div>
        <Button asChild>
          <Link to="/new" className="gap-2">
            <FilePlus2 className="h-4 w-4" />
            New request
          </Link>
        </Button>
      </div>

      {error ? (
        <Alert className="border-destructive text-destructive">
          <AlertTitle>Could not load requests</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!requests && !error ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : null}

      {requests && requests.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <Inbox className="h-10 w-10 text-muted-foreground" />
            <EmptyTitle>No requests yet</EmptyTitle>
            <EmptyDescription>
              Submit your first UX SN Tasting Session request to get started.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link to="/new">Create a request</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : null}

      {requests && requests.length > 0 ? (
        <div className="space-y-3">
          {requests.map((r) => {
            const awaiting = r.status === 'APPROVED_AWAITING_SECTION2';
            return (
              <Card key={r.id} className={awaiting ? 'border-primary' : ''}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {r.reference}
                      </span>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="font-medium text-foreground mt-1 truncate">
                      {r.section1.eventName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {r.section1.requestType} · {r.section1.eventLocation} ·{' '}
                      {r.section1.eventDates}
                    </p>
                  </div>
                  <Button
                    asChild
                    variant={awaiting ? 'default' : 'outline'}
                    className="gap-2 shrink-0"
                  >
                    <Link to={`/requests/${r.id}`}>
                      {awaiting ? (
                        <>
                          <FileEdit className="h-4 w-4" />
                          Complete Section 2
                        </>
                      ) : (
                        <>
                          View
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
