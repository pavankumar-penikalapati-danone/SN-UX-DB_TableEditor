import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Skeleton,
  Textarea,
} from '@databricks/appkit-ui/react';
import { ArrowLeft, Plus, Send, Trash2 } from 'lucide-react';
import { Field } from '../components/Field';
import { StatusBadge } from '../components/StatusBadge';
import { useSession } from '../lib/session';
import { getRequest, submitSection2 } from '../lib/api';
import {
  ONSITE_SUPPORT_OPTIONS,
  PRODUCT_STATUSES,
  SERVING_TEMPERATURES,
  isExternal,
  type OnsiteSupport,
  type Product,
  type ProductStatus,
  type Section2,
  type ServingTemperature,
  type TastingRequest,
} from '../../../shared/schema';

const EMPTY_PRODUCT: Product = {
  brandName: '',
  productNameFlavour: '',
  country: '',
  productStatus: 'Existing product',
  pdsSku: '',
  quantity: '',
};

const EMPTY_SECTION2: Section2 = {
  products: [{ ...EMPTY_PRODUCT }],
  deliveryAddress: '',
  onSiteContact: '',
  extraMaterials: '',
  sessionTimes: '',
  exactLocation: '',
  exactNumParticipants: '',
  servingTemperature: 'Chilled',
  onsiteSupport: [],
  specialRequests: '',
  comments: '',
};

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

export function RequestDetailPage() {
  const { id = '' } = useParams();
  const { whoami } = useSession();
  const [request, setRequest] = useState<TastingRequest | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    getRequest(id)
      .then(setRequest)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load'),
      );
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <Alert className="border-destructive text-destructive">
          <AlertTitle>Could not load request</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/my">Back to my requests</Link>
        </Button>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="max-w-3xl mx-auto">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const s1 = request.section1;
  const external = isExternal(s1);
  const isOwner = whoami?.email === request.requesterEmail;
  const canFillSection2 =
    isOwner && request.status === 'APPROVED_AWAITING_SECTION2';
  const profile =
    s1.participantProfile === 'Other' && s1.participantProfileOther
      ? `Other: ${s1.participantProfileOther}`
      : s1.participantProfile;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link to="/my">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <StatusBadge status={request.status} />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-foreground">
          {s1.eventName}
        </h2>
        <p className="text-muted-foreground mt-1 font-mono text-sm">
          {request.reference} · {s1.requestType}
        </p>
      </div>

      {/* Decision banner */}
      {request.decision ? (
        <Alert
          className={
            request.decision.decision === 'approve'
              ? 'border-success text-success'
              : 'border-destructive text-destructive'
          }
        >
          <AlertTitle>
            {request.decision.decision === 'approve'
              ? 'Approved'
              : 'Rejected'}{' '}
            by {request.decision.approverEmail}
          </AlertTitle>
          {request.decision.note ? (
            <AlertDescription>“{request.decision.note}”</AlertDescription>
          ) : null}
        </Alert>
      ) : null}

      {/* Section 1 summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Section 1 — Overall &amp; General</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <DetailRow label="Requester" value={s1.requesterName} />
            <DetailRow label="Cost center" value={s1.costCenter} />
            <DetailRow label="Date(s)" value={s1.eventDates} />
            <DetailRow label="Time(s)" value={s1.eventTimes} />
            <DetailRow label="Location" value={s1.eventLocation} />
            <DetailRow label="Participants" value={s1.numParticipants} />
            <DetailRow label="Profile" value={profile} />
            <DetailRow label="Markets" value={s1.participantCountries} />
          </dl>
        </CardContent>
      </Card>

      {/* Section 2: read-only if submitted, form if owner can fill */}
      {request.section2 ? (
        <Section2Readonly section2={request.section2} external={external} />
      ) : canFillSection2 ? (
        <Section2Form external={external} onSubmitted={load} requestId={request.id} />
      ) : request.status === 'PENDING_APPROVAL' ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Section 2 will unlock here once your request is approved.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 2 — editable form
// ---------------------------------------------------------------------------

function Section2Form({
  external,
  requestId,
  onSubmitted,
}: {
  external: boolean;
  requestId: string;
  onSubmitted: () => void;
}) {
  const [form, setForm] = useState<Section2>(EMPTY_SECTION2);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof Section2>(key: K, value: Section2[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateProduct(index: number, patch: Partial<Product>) {
    setForm((prev) => ({
      ...prev,
      products: prev.products.map((p, i) =>
        i === index ? { ...p, ...patch } : p,
      ),
    }));
  }

  function addProduct() {
    setForm((prev) => ({
      ...prev,
      products: [...prev.products, { ...EMPTY_PRODUCT }],
    }));
  }

  function removeProduct(index: number) {
    setForm((prev) => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index),
    }));
  }

  function toggleSupport(option: OnsiteSupport, checked: boolean) {
    setForm((prev) => ({
      ...prev,
      onsiteSupport: checked
        ? [...prev.onsiteSupport, option]
        : prev.onsiteSupport.filter((o) => o !== option),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await submitSection2(requestId, form);
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
      {error ? (
        <Alert className="border-destructive text-destructive">
          <AlertTitle>Could not submit Section 2</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {/* Product(s) to be sourced */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Section 2 — Product(s) to be sourced</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {form.products.map((product, index) => (
            <div key={index} className="rounded-lg border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Product {index + 1}</span>
                {form.products.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-destructive"
                    onClick={() => removeProduct(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                ) : null}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Brand Name" required hint="e.g. Fortimel">
                  <Input
                    value={product.brandName}
                    onChange={(e) =>
                      updateProduct(index, { brandName: e.target.value })
                    }
                  />
                </Field>
                <Field
                  label="Product Name & Flavour(s)"
                  required
                  hint="e.g. Plant-Based HEHP Pea Mint"
                >
                  <Input
                    value={product.productNameFlavour}
                    onChange={(e) =>
                      updateProduct(index, {
                        productNameFlavour: e.target.value,
                      })
                    }
                  />
                </Field>
                <Field
                  label="Country/Market"
                  hint="Leave empty if the sourcing country does not matter"
                >
                  <Input
                    value={product.country}
                    onChange={(e) =>
                      updateProduct(index, { country: e.target.value })
                    }
                  />
                </Field>
                <Field label="Product Status" required>
                  <Select
                    value={product.productStatus}
                    onValueChange={(v) =>
                      updateProduct(index, {
                        productStatus: v as ProductStatus,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field
                  label="PDS/SKU Code"
                  hint="If newly launched and only available through our factories"
                >
                  <Input
                    value={product.pdsSku}
                    onChange={(e) =>
                      updateProduct(index, { pdsSku: e.target.value })
                    }
                  />
                </Field>
                <Field label="Quantity Needed for Display">
                  <Input
                    value={product.quantity}
                    onChange={(e) =>
                      updateProduct(index, { quantity: e.target.value })
                    }
                  />
                </Field>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" className="gap-2" onClick={addProduct}>
            <Plus className="h-4 w-4" />
            Add another product
          </Button>
        </CardContent>
      </Card>

      {/* Logistics (external only) */}
      {external ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Logistics (External Visits)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <Field label="Delivery Address" required>
              <Textarea
                value={form.deliveryAddress}
                onChange={(e) => set('deliveryAddress', e.target.value)}
                rows={2}
              />
            </Field>
            <Field label="On-Site Contact" required hint="Including email address">
              <Input
                value={form.onSiteContact}
                onChange={(e) => set('onSiteContact', e.target.value)}
                placeholder="Name and email"
              />
            </Field>
            <Field
              label="Extra products or materials needed?"
              hint="e.g. Evian etc."
            >
              <Textarea
                value={form.extraMaterials}
                onChange={(e) => set('extraMaterials', e.target.value)}
                rows={2}
              />
            </Field>
          </CardContent>
        </Card>
      ) : null}

      {/* Sample preparation & serving */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sample Preparation &amp; Serving</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <Field
            label="Specific Time(s) of the Tasting Session(s)"
            required
            hint="Indicative if not sure yet"
          >
            <Input
              value={form.sessionTimes}
              onChange={(e) => set('sessionTimes', e.target.value)}
            />
          </Field>
          <Field
            label="Exact Location Event"
            required
            hint="Including meeting room if in Utrecht"
          >
            <Input
              value={form.exactLocation}
              onChange={(e) => set('exactLocation', e.target.value)}
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Exact Number of Participants" required>
              <Input
                value={form.exactNumParticipants}
                onChange={(e) => set('exactNumParticipants', e.target.value)}
              />
            </Field>
            <Field label="Serving Temperature" required>
              <Select
                value={form.servingTemperature}
                onValueChange={(v) =>
                  set('servingTemperature', v as ServingTemperature)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVING_TEMPERATURES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="On-site Support Needed" required hint="Select all that apply">
            <div className="flex flex-col gap-2">
              {ONSITE_SUPPORT_OPTIONS.map((option) => (
                <div key={option} className="flex items-center gap-2">
                  <Checkbox
                    id={`support-${option}`}
                    checked={form.onsiteSupport.includes(option)}
                    onCheckedChange={(c) => toggleSupport(option, c === true)}
                  />
                  <Label htmlFor={`support-${option}`} className="font-normal">
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          </Field>

          <Field label="Special Requests" hint="e.g. bottle-prep demonstration">
            <Textarea
              value={form.specialRequests}
              onChange={(e) => set('specialRequests', e.target.value)}
              rows={2}
            />
          </Field>
          <Field label="Comments">
            <Textarea
              value={form.comments}
              onChange={(e) => set('comments', e.target.value)}
              rows={3}
            />
          </Field>
        </CardContent>
      </Card>

      <Separator />
      <div className="flex justify-end">
        <Button type="submit" disabled={submitting} className="gap-2">
          <Send className="h-4 w-4" />
          {submitting ? 'Submitting…' : 'Submit Section 2'}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Section 2 — read-only view
// ---------------------------------------------------------------------------

function Section2Readonly({
  section2,
  external,
}: {
  section2: Section2;
  external: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Section 2 — Specific details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-3">
          {section2.products.map((p, i) => (
            <div key={i} className="rounded-lg border p-3">
              <p className="text-sm font-medium">
                {p.brandName} — {p.productNameFlavour}
              </p>
              <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <DetailRow label="Status" value={p.productStatus} />
                <DetailRow label="Country" value={p.country} />
                <DetailRow label="PDS/SKU" value={p.pdsSku} />
                <DetailRow label="Quantity" value={p.quantity} />
              </dl>
            </div>
          ))}
        </div>

        {external ? (
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DetailRow label="Delivery address" value={section2.deliveryAddress} />
            <DetailRow label="On-site contact" value={section2.onSiteContact} />
            <DetailRow label="Extra materials" value={section2.extraMaterials} />
          </dl>
        ) : null}

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <DetailRow label="Session time(s)" value={section2.sessionTimes} />
          <DetailRow label="Exact location" value={section2.exactLocation} />
          <DetailRow label="Exact participants" value={section2.exactNumParticipants} />
          <DetailRow label="Serving temp." value={section2.servingTemperature} />
          <DetailRow label="On-site support" value={section2.onsiteSupport.join(', ')} />
        </dl>
        <DetailRow label="Special requests" value={section2.specialRequests} />
        <DetailRow label="Comments" value={section2.comments} />
      </CardContent>
    </Card>
  );
}
