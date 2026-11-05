import type { OrderStatus, SubmissionStatus, ProductionStatus, AgreementStatus, EarningStatus, ApplicationStatus } from './types';

export const money = (value: number | string, currency = 'GEL') =>
  new Intl.NumberFormat('en-GE', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value));

export const date = (iso: string | null | undefined, withTime = false) =>
  iso
    ? new Intl.DateTimeFormat('en-GB', withTime
        ? { dateStyle: 'medium', timeStyle: 'short' }
        : { dateStyle: 'medium' }).format(new Date(iso))
    : '—';

export const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

export const discountPct = (price: number, compare: number | null) =>
  compare && compare > price ? Math.round(((compare - price) / compare) * 100) : 0;

type Tone = 'neutral' | 'ember' | 'green' | 'blue' | 'red' | 'amber' | 'violet';

export const orderStatusMeta: Record<OrderStatus, { label: string; tone: Tone; icon: string }> = {
  pending_payment: { label: 'Awaiting payment', tone: 'amber', icon: 'schedule' },
  payment_failed: { label: 'Payment failed', tone: 'red', icon: 'error' },
  paid: { label: 'Paid', tone: 'green', icon: 'paid' },
  processing: { label: 'Processing', tone: 'blue', icon: 'inventory_2' },
  shipped: { label: 'Shipped', tone: 'violet', icon: 'local_shipping' },
  delivered: { label: 'Delivered', tone: 'green', icon: 'task_alt' },
  cancelled: { label: 'Cancelled', tone: 'neutral', icon: 'block' },
  refunded: { label: 'Refunded', tone: 'neutral', icon: 'undo' },
};

export const submissionStatusMeta: Record<SubmissionStatus, { label: string; tone: Tone }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  submitted: { label: 'Submitted', tone: 'blue' },
  in_review: { label: 'In review', tone: 'amber' },
  changes_requested: { label: 'Changes requested', tone: 'ember' },
  approved: { label: 'Approved', tone: 'green' },
  rejected: { label: 'Not selected', tone: 'red' },
};

export const productionStatusMeta: Record<ProductionStatus, { label: string; tone: Tone }> = {
  not_started: { label: 'Not started', tone: 'neutral' },
  prototyping: { label: 'Prototyping', tone: 'blue' },
  tooling: { label: 'Tooling', tone: 'violet' },
  manufacturing: { label: 'Manufacturing', tone: 'amber' },
  released: { label: 'Released', tone: 'green' },
  discontinued: { label: 'Discontinued', tone: 'neutral' },
};

export const agreementStatusMeta: Record<AgreementStatus, { label: string; tone: Tone }> = {
  proposed: { label: 'Awaiting your response', tone: 'amber' },
  active: { label: 'Active', tone: 'green' },
  declined: { label: 'Declined', tone: 'neutral' },
  terminated: { label: 'Terminated', tone: 'red' },
};

export const earningStatusMeta: Record<EarningStatus, { label: string; tone: Tone }> = {
  pending: { label: 'Pending (return window)', tone: 'amber' },
  payable: { label: 'Payable', tone: 'blue' },
  paid: { label: 'Paid out', tone: 'green' },
  void: { label: 'Void', tone: 'neutral' },
};

export const applicationStatusMeta: Record<ApplicationStatus, { label: string; tone: Tone }> = {
  pending: { label: 'Under review', tone: 'amber' },
  approved: { label: 'Approved', tone: 'green' },
  rejected: { label: 'Not approved', tone: 'red' },
};

export type { Tone };
