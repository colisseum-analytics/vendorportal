// A fixed starter list rather than a per-neighborhood-configurable one
// (unlike vendor categories) — keeps the Needs board scoped for v1.
export const NEED_CATEGORIES = [
  'Security & Gates',
  'Electrical',
  'Plumbing',
  'Landscaping',
  'Painting',
  'Pest Control',
  'General Maintenance',
  'Other',
]

export const SEVERITIES = ['low', 'medium', 'high', 'emergency']
export const STATUSES = ['open', 'under_review', 'resolved']

export const SEVERITY_LABEL_KEY = {
  low: 'serviceBoard.severityLow',
  medium: 'serviceBoard.severityMedium',
  high: 'serviceBoard.severityHigh',
  emergency: 'serviceBoard.severityEmergency',
}

export const SEVERITY_BADGE_CLASS = {
  low: 'badge-active',
  medium: 'badge-neutral',
  high: 'badge-warning',
  emergency: 'badge-inactive',
}

export const STATUS_LABEL_KEY = {
  open: 'serviceBoard.statusOpen',
  under_review: 'serviceBoard.statusUnderReview',
  resolved: 'serviceBoard.statusResolved',
}

export const STATUS_BADGE_CLASS = {
  open: 'badge-neutral',
  under_review: 'badge-warning',
  resolved: 'badge-active',
}
