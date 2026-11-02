import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Textarea,
  Label,
} from '@databricks/appkit-ui/react';
import { CheckCircle2, Send } from 'lucide-react';
import { Field } from '../components/Field';
import { createRequest } from '../lib/api';
import {
  PARTICIPANT_PROFILES,
  REQUEST_TYPES,
  type ParticipantProfile,
  type RequestType,
  type Section1,
  type TastingRequest,
} from '../../../shared/schema';

const EMPTY: Section1 = {
  requesterName: '',
  requestType: 'Internal Product Tasting',
  costCenter: '',
  eventName: '',
  eventDates: '',
  eventTimes: '',
  eventLocation: '',
  numParticipants: '',
  participantProfile: 'Senior Leadership',
  participantProfileOther: '',
  participantCountries: '',
};

export function NewRequestPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<Section1>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<TastingRequest | null>(null);

  function set<K extends keyof Section1>(key: K, value: Section1[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const record = await createRequest(form);
      setCreated(record);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-6 w-6" />
              <CardTitle>Request submitted</CardTitle>
            </div>
            <CardDescription>
              Your request <strong>{created.reference}</strong> has been sent to
              the approver (Claudia) for review. You will see the status update
              under “My requests”, and once approved you can complete Section 2.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={() => void navigate('/my')}>Go to my requests</Button>
            <Button
              variant="outline"
              onClick={() => {
                setCreated(null);
                setForm(EMPTY);
              }}
            >
              Submit another request
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          UX SN Tasting Sessions — Request Form
        </h2>
        <p className="text-muted-foreground mt-1">
          Use this form to request support for organizing UX SN Tasting
          Sessions, whether conducted internally at the R&amp;I Center in Utrecht
          or externally at another location. Once submitted, your request is
          reviewed and you will receive confirmation within 3 working days. Any
          questions? Contact Charlotte Snethlage.
        </p>
      </div>

      {error ? (
        <Alert className="border-destructive text-destructive">
          <AlertTitle>Could not submit</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
        {/* SECTION 1A - OVERALL */}
        <Card>
          <CardHeader>
            <CardTitle>Section 1A — Overall</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <Field label="Name of Requester" required htmlFor="requesterName">
              <Input
                id="requesterName"
                value={form.requesterName}
                onChange={(e) => set('requesterName', e.target.value)}
                placeholder="Your full name"
              />
            </Field>

            <Field label="Request Type" required>
              <RadioGroup
                value={form.requestType}
                onValueChange={(v) => set('requestType', v as RequestType)}
                className="flex flex-col gap-2"
              >
                {REQUEST_TYPES.map((rt) => (
                  <div key={rt} className="flex items-center gap-2">
                    <RadioGroupItem value={rt} id={`rt-${rt}`} />
                    <Label htmlFor={`rt-${rt}`} className="font-normal">
                      {rt}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </Field>

            <Field label="Cost Center" hint="If costs are involved" htmlFor="costCenter">
              <Input
                id="costCenter"
                value={form.costCenter}
                onChange={(e) => set('costCenter', e.target.value)}
                placeholder="e.g. 12345"
              />
            </Field>
          </CardContent>
        </Card>

        {/* SECTION 1B - GENERAL */}
        <Card>
          <CardHeader>
            <CardTitle>Section 1B — General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <Field label="Name Event" required htmlFor="eventName">
              <Input
                id="eventName"
                value={form.eventName}
                onChange={(e) => set('eventName', e.target.value)}
                placeholder="Event name"
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Date(s) Event" required htmlFor="eventDates">
                <Input
                  id="eventDates"
                  type="text"
                  value={form.eventDates}
                  onChange={(e) => set('eventDates', e.target.value)}
                  placeholder="e.g. 12–13 June 2025"
                />
              </Field>
              <Field
                label="Overall Time(s) Event"
                required
                hint="Indicative if not sure yet, e.g. morning/afternoon"
                htmlFor="eventTimes"
              >
                <Input
                  id="eventTimes"
                  value={form.eventTimes}
                  onChange={(e) => set('eventTimes', e.target.value)}
                  placeholder="e.g. Morning"
                />
              </Field>
            </div>

            <Field
              label="Location Event"
              required
              hint="e.g. Utrecht or another Country/City"
              htmlFor="eventLocation"
            >
              <Input
                id="eventLocation"
                value={form.eventLocation}
                onChange={(e) => set('eventLocation', e.target.value)}
                placeholder="e.g. Utrecht, NL"
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Number of Participants"
                required
                hint="Indicative if not sure yet"
                htmlFor="numParticipants"
              >
                <Input
                  id="numParticipants"
                  value={form.numParticipants}
                  onChange={(e) => set('numParticipants', e.target.value)}
                  placeholder="e.g. 20"
                />
              </Field>
              <Field label="Participant Profile" required>
                <Select
                  value={form.participantProfile}
                  onValueChange={(v) =>
                    set('participantProfile', v as ParticipantProfile)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a profile" />
                  </SelectTrigger>
                  <SelectContent>
                    {PARTICIPANT_PROFILES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {form.participantProfile === 'Other' ? (
              <Field label="Please specify the participant profile" htmlFor="profileOther">
                <Input
                  id="profileOther"
                  value={form.participantProfileOther}
                  onChange={(e) =>
                    set('participantProfileOther', e.target.value)
                  }
                  placeholder="Describe the audience"
                />
              </Field>
            ) : null}

            <Field label="Country/Market(s) of Participants" htmlFor="participantCountries">
              <Textarea
                id="participantCountries"
                value={form.participantCountries}
                onChange={(e) => set('participantCountries', e.target.value)}
                placeholder="e.g. Netherlands, Germany, France"
                rows={2}
              />
            </Field>
          </CardContent>
        </Card>

        <Separator />

        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Section 2 (product &amp; logistics details) becomes available after
            your request is approved.
          </p>
          <Button type="submit" disabled={submitting} className="gap-2">
            <Send className="h-4 w-4" />
            {submitting ? 'Submitting…' : 'Submit request'}
          </Button>
        </div>
      </form>
    </div>
  );
}
