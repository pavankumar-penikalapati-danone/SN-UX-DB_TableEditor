import type { Request } from 'express';
import { createApp, server } from '@databricks/appkit';
import {
  decisionSchema,
  isExternal,
  section1Schema,
  section2Schema,
} from '../shared/schema.js';
import { InMemoryRequestStore } from './store.js';

/**
 * Approver (e.g. Claudia) email allow-list, configured via the APPROVER_EMAILS
 * env var in app.yaml (comma-separated, non-secret). Anyone whose identity is
 * in this list sees the Approvals view and can approve/reject requests.
 */
const APPROVER_EMAILS = (process.env.APPROVER_EMAILS ?? '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function isApprover(email: string): boolean {
  return APPROVER_EMAILS.includes(email.toLowerCase());
}

// In development (builder preview) we enable the in-app persona switcher so the
// full requester/approver workflow can be exercised without the platform proxy.
// In production the real forwarded identity is always trusted.
const DEMO_MODE = process.env.NODE_ENV !== 'production';

/**
 * Resolve the current user's identity.
 * - In a deployed Databricks App, the platform proxy injects x-forwarded-email;
 *   that is the only trusted identity in production.
 * - In the builder preview (development) there is no real signed-in user, so the
 *   in-app persona switcher supplies an x-demo-user header, with a final local
 *   dev fallback. This is only an identity for workflow routing, never a
 *   credential, and the demo override is ignored entirely in production.
 */
function currentUser(req: Request): string {
  if (DEMO_MODE) {
    const demo = req.header('x-demo-user');
    if (demo && demo.trim()) return demo.trim().toLowerCase();
  }
  const forwarded =
    req.header('x-forwarded-email') ?? req.header('x-forwarded-user');
  if (forwarded && forwarded.trim()) return forwarded.trim().toLowerCase();
  return DEMO_MODE ? 'dev.user@danone.com' : '';
}

const store = new InMemoryRequestStore();

await createApp({
  plugins: [server()],
  onPluginsReady(appkit) {
    appkit.server.extend((app) => {
      // --- Identity ---------------------------------------------------------
      app.get('/api/whoami', (req, res) => {
        const email = currentUser(req);
        res.json({ email, isApprover: isApprover(email), demoMode: DEMO_MODE });
      });

      // --- Create (Section 1) ----------------------------------------------
      app.post('/api/requests', async (req, res) => {
        const parsed = section1Schema.safeParse(req.body);
        if (!parsed.success) {
          res
            .status(400)
            .json({ error: 'Invalid input', issues: parsed.error.issues });
          return;
        }
        const email = currentUser(req);
        const record = await store.create({
          requesterEmail: email,
          section1: parsed.data,
        });
        res.status(201).json(record);
      });

      // --- List current user's requests ------------------------------------
      app.get('/api/requests/mine', async (req, res) => {
        const email = currentUser(req);
        res.json(await store.listByRequester(email));
      });

      // --- Approval queue (approvers only) ---------------------------------
      app.get('/api/requests/pending', async (req, res) => {
        const email = currentUser(req);
        if (!isApprover(email)) {
          res.status(403).json({ error: 'Not authorized to view approvals' });
          return;
        }
        res.json(await store.listPending());
      });

      // --- All requests (approvers only) -----------------------------------
      app.get('/api/requests/all', async (req, res) => {
        const email = currentUser(req);
        if (!isApprover(email)) {
          res.status(403).json({ error: 'Not authorized' });
          return;
        }
        res.json(await store.listAll());
      });

      // --- Single request (owner or approver) ------------------------------
      app.get('/api/requests/:id', async (req, res) => {
        const email = currentUser(req);
        const record = await store.getById(req.params.id);
        if (!record) {
          res.status(404).json({ error: 'Request not found' });
          return;
        }
        if (record.requesterEmail !== email && !isApprover(email)) {
          res.status(403).json({ error: 'Not authorized to view this request' });
          return;
        }
        res.json(record);
      });

      // --- Approve / reject (approvers only) -------------------------------
      app.post('/api/requests/:id/decision', async (req, res) => {
        const email = currentUser(req);
        if (!isApprover(email)) {
          res.status(403).json({ error: 'Not authorized to approve requests' });
          return;
        }
        const parsed = decisionSchema.safeParse(req.body);
        if (!parsed.success) {
          res
            .status(400)
            .json({ error: 'Invalid input', issues: parsed.error.issues });
          return;
        }
        const record = await store.getById(req.params.id);
        if (!record) {
          res.status(404).json({ error: 'Request not found' });
          return;
        }
        if (record.status !== 'PENDING_APPROVAL') {
          res
            .status(409)
            .json({ error: 'This request is not awaiting approval' });
          return;
        }
        const updated = await store.setDecision(req.params.id, {
          approverEmail: email,
          decision: parsed.data.decision,
          note: parsed.data.note,
          decidedAt: new Date().toISOString(),
        });
        res.json(updated);
      });

      // --- Submit Section 2 (owner only, after approval) -------------------
      app.post('/api/requests/:id/section2', async (req, res) => {
        const email = currentUser(req);
        const record = await store.getById(req.params.id);
        if (!record) {
          res.status(404).json({ error: 'Request not found' });
          return;
        }
        if (record.requesterEmail !== email) {
          res
            .status(403)
            .json({ error: 'Only the requester can complete Section 2' });
          return;
        }
        if (record.status !== 'APPROVED_AWAITING_SECTION2') {
          res.status(409).json({
            error: 'Section 2 can only be completed after approval',
          });
          return;
        }
        const parsed = section2Schema.safeParse(req.body);
        if (!parsed.success) {
          res
            .status(400)
            .json({ error: 'Invalid input', issues: parsed.error.issues });
          return;
        }
        // External visits require delivery address and on-site contact.
        if (isExternal(record.section1)) {
          const missing: string[] = [];
          if (!parsed.data.deliveryAddress) missing.push('Delivery Address');
          if (!parsed.data.onSiteContact) missing.push('On-Site Contact');
          if (missing.length > 0) {
            res.status(400).json({
              error: `Required for external visits: ${missing.join(', ')}`,
            });
            return;
          }
        }
        const updated = await store.setSection2(req.params.id, parsed.data);
        res.json(updated);
      });
    });
  },
}).catch(console.error);
