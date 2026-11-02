import { randomUUID } from 'node:crypto';
import type {
  ApprovalDecision,
  Section1,
  Section2,
  TastingRequest,
} from '../shared/schema.js';

/**
 * Storage abstraction for tasting-session requests.
 *
 * This interface is intentionally Promise-based so the backing implementation
 * can be swapped (e.g. from the in-memory store below to a Lakebase/Postgres
 * store) without touching the Express routes. See InMemoryRequestStore for the
 * current implementation used while the app space does not permit attaching a
 * Lakebase database resource.
 */
export interface RequestStore {
  create(input: { requesterEmail: string; section1: Section1 }): Promise<TastingRequest>;
  getById(id: string): Promise<TastingRequest | undefined>;
  listByRequester(email: string): Promise<TastingRequest[]>;
  listPending(): Promise<TastingRequest[]>;
  listAll(): Promise<TastingRequest[]>;
  setDecision(id: string, decision: ApprovalDecision): Promise<TastingRequest | undefined>;
  setSection2(id: string, section2: Section2): Promise<TastingRequest | undefined>;
}

function nowIso(): string {
  return new Date().toISOString();
}

export class InMemoryRequestStore implements RequestStore {
  private readonly items = new Map<string, TastingRequest>();
  private seq = 0;

  create(input: { requesterEmail: string; section1: Section1 }): Promise<TastingRequest> {
    const id = randomUUID();
    this.seq += 1;
    const ts = nowIso();
    const record: TastingRequest = {
      id,
      reference: `TS-${String(this.seq).padStart(4, '0')}`,
      status: 'PENDING_APPROVAL',
      requesterEmail: input.requesterEmail,
      createdAt: ts,
      updatedAt: ts,
      section1: input.section1,
    };
    this.items.set(id, record);
    return Promise.resolve(record);
  }

  getById(id: string): Promise<TastingRequest | undefined> {
    return Promise.resolve(this.items.get(id));
  }

  private sortedByNewest(items: TastingRequest[]): TastingRequest[] {
    return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  listByRequester(email: string): Promise<TastingRequest[]> {
    return Promise.resolve(
      this.sortedByNewest(
        [...this.items.values()].filter((r) => r.requesterEmail === email),
      ),
    );
  }

  listPending(): Promise<TastingRequest[]> {
    return Promise.resolve(
      this.sortedByNewest(
        [...this.items.values()].filter((r) => r.status === 'PENDING_APPROVAL'),
      ),
    );
  }

  listAll(): Promise<TastingRequest[]> {
    return Promise.resolve(this.sortedByNewest([...this.items.values()]));
  }

  setDecision(
    id: string,
    decision: ApprovalDecision,
  ): Promise<TastingRequest | undefined> {
    const record = this.items.get(id);
    if (!record) return Promise.resolve(undefined);
    record.decision = decision;
    record.status =
      decision.decision === 'approve' ? 'APPROVED_AWAITING_SECTION2' : 'REJECTED';
    record.updatedAt = nowIso();
    this.items.set(id, record);
    return Promise.resolve(record);
  }

  setSection2(id: string, section2: Section2): Promise<TastingRequest | undefined> {
    const record = this.items.get(id);
    if (!record) return Promise.resolve(undefined);
    record.section2 = section2;
    record.status = 'SECTION2_SUBMITTED';
    record.updatedAt = nowIso();
    this.items.set(id, record);
    return Promise.resolve(record);
  }
}
