import { z } from 'zod';

/**
 * Shared domain schema for the UX SN Tasting Sessions request workflow.
 * Used by both the server (validation) and the client (form typing).
 */

// ---------------------------------------------------------------------------
// Enumerations / option lists
// ---------------------------------------------------------------------------

export const REQUEST_TYPES = [
  'Internal Product Tasting',
  'External Product Tasting',
] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export const PARTICIPANT_PROFILES = [
  'Senior Leadership',
  'KOLs',
  'HCPs',
  'Students',
  'Other',
] as const;
export type ParticipantProfile = (typeof PARTICIPANT_PROFILES)[number];

export const PRODUCT_STATUSES = [
  'Existing product',
  'Prototype',
  'Competitor',
] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const SERVING_TEMPERATURES = ['Chilled', 'Ambient', 'Warm'] as const;
export type ServingTemperature = (typeof SERVING_TEMPERATURES)[number];

export const ONSITE_SUPPORT_OPTIONS = [
  'Sample Preparation',
  'Serving to Participants',
  'Cleaning',
] as const;
export type OnsiteSupport = (typeof ONSITE_SUPPORT_OPTIONS)[number];

// Workflow status: Section 1 submitted -> awaiting Claudia's approval ->
// approved (requester fills Section 2) -> fully submitted. Or rejected.
export const REQUEST_STATUSES = [
  'PENDING_APPROVAL',
  'APPROVED_AWAITING_SECTION2',
  'SECTION2_SUBMITTED',
  'REJECTED',
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

// ---------------------------------------------------------------------------
// Section 1 (1A Overall + 1B General) — filled by the end user first
// ---------------------------------------------------------------------------

export const section1Schema = z.object({
  // Section 1A - Overall
  requesterName: z.string().trim().min(1, 'Name of requester is required'),
  requestType: z.enum(REQUEST_TYPES),
  costCenter: z.string().trim().default(''),
  // Section 1B - General
  eventName: z.string().trim().min(1, 'Event name is required'),
  eventDates: z.string().trim().min(1, 'Date(s) of the event are required'),
  eventTimes: z.string().trim().min(1, 'Overall time(s) are required'),
  eventLocation: z.string().trim().min(1, 'Location is required'),
  numParticipants: z.string().trim().min(1, 'Number of participants is required'),
  participantProfile: z.enum(PARTICIPANT_PROFILES),
  participantProfileOther: z.string().trim().default(''),
  participantCountries: z.string().trim().default(''),
});
export type Section1 = z.infer<typeof section1Schema>;

// ---------------------------------------------------------------------------
// Section 2 (Specific) — filled by the end user AFTER approval
// ---------------------------------------------------------------------------

export const productSchema = z.object({
  brandName: z.string().trim().min(1, 'Brand name is required'),
  productNameFlavour: z
    .string()
    .trim()
    .min(1, 'Product name & flavour is required'),
  country: z.string().trim().default(''),
  productStatus: z.enum(PRODUCT_STATUSES),
  pdsSku: z.string().trim().default(''),
  quantity: z.string().trim().default(''),
});
export type Product = z.infer<typeof productSchema>;

export const section2Schema = z.object({
  // Product(s) to be sourced
  products: z.array(productSchema).min(1, 'Add at least one product'),
  // Logistics (External visits only)
  deliveryAddress: z.string().trim().default(''),
  onSiteContact: z.string().trim().default(''),
  extraMaterials: z.string().trim().default(''),
  // Sample preparation & serving
  sessionTimes: z
    .string()
    .trim()
    .min(1, 'Specific time(s) of the tasting session are required'),
  exactLocation: z.string().trim().min(1, 'Exact location is required'),
  exactNumParticipants: z
    .string()
    .trim()
    .min(1, 'Exact number of participants is required'),
  servingTemperature: z.enum(SERVING_TEMPERATURES),
  onsiteSupport: z
    .array(z.enum(ONSITE_SUPPORT_OPTIONS))
    .min(1, 'Select at least one on-site support option'),
  specialRequests: z.string().trim().default(''),
  comments: z.string().trim().default(''),
});
export type Section2 = z.infer<typeof section2Schema>;

export const decisionSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  note: z.string().trim().default(''),
});
export type Decision = z.infer<typeof decisionSchema>;

// ---------------------------------------------------------------------------
// Full stored record
// ---------------------------------------------------------------------------

export interface ApprovalDecision {
  approverEmail: string;
  decision: 'approve' | 'reject';
  note: string;
  decidedAt: string;
}

export interface TastingRequest {
  id: string;
  reference: string;
  status: RequestStatus;
  requesterEmail: string;
  createdAt: string;
  updatedAt: string;
  section1: Section1;
  decision?: ApprovalDecision;
  section2?: Section2;
}

export interface WhoAmI {
  email: string;
  isApprover: boolean;
  /** True in the builder preview, where the in-app persona switcher is active. */
  demoMode: boolean;
}

export function isExternal(section1: Section1): boolean {
  return section1.requestType === 'External Product Tasting';
}

export const STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING_APPROVAL: 'Pending approval',
  APPROVED_AWAITING_SECTION2: 'Approved — complete Section 2',
  SECTION2_SUBMITTED: 'Submitted',
  REJECTED: 'Rejected',
};
