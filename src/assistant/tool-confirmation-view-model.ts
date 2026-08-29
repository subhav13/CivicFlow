export interface ConfirmationDraftField {
  label: string;
  value: string;
}

export interface ConfirmationDraft {
  title: string;
  fields: readonly ConfirmationDraftField[];
}

/** Builds the single review prompt shared by captions and spoken feedback. */
export function createConfirmationNarration(draft: ConfirmationDraft): string {
  const details = draft.fields
    .map((field) => `${field.label}: ${field.value}`)
    .join('. ');
  const detailSentence = details ? ` ${details}.` : '';
  return `All right. I have prepared these details for review.${detailSentence} Is everything correct, or do you need changes?`;
}

export interface EffectiveConfirmationDraftContext {
  applicantLastName?: string;
  selectedHouseholdMember?: {
    firstName: string;
    lastName: string;
    ageYears: number;
    relationship: string;
    applyingForCoverage: boolean;
  };
  selectedIncomeSource?: {
    ownerName: string;
    employerName: string;
    amount: number;
    frequency: string;
  };
}

export type ConfirmationDraftFactory = (
  toolName: string,
  argumentsValue: unknown,
) => ConfirmationDraft | undefined;

const MAX_DISPLAY_VALUE_LENGTH = 160;

type DraftField = {
  key: string;
  label: string;
};

const DRAFTS: Readonly<
  Record<
    string,
    {
      title: string;
      fields: readonly DraftField[];
    }
  >
> = {
  add_household_member: {
    title: 'Add household member',
    fields: [
      { key: 'firstName', label: 'First name' },
      { key: 'lastName', label: 'Last name' },
      { key: 'ageYears', label: 'Age' },
      { key: 'relationship', label: 'Relationship' },
      { key: 'applyingForCoverage', label: 'Applying for coverage' },
    ],
  },
  update_household_member: {
    title: 'Update household member',
    fields: [
      { key: 'firstName', label: 'First name' },
      { key: 'lastName', label: 'Last name' },
      { key: 'ageYears', label: 'Age' },
      { key: 'relationship', label: 'Relationship' },
      { key: 'applyingForCoverage', label: 'Applying for coverage' },
    ],
  },
  add_income_source: {
    title: 'Add income source',
    fields: [
      { key: 'ownerName', label: 'Member' },
      { key: 'employerName', label: 'Employer or source' },
      { key: 'amount', label: 'Amount' },
      { key: 'frequency', label: 'Frequency' },
    ],
  },
  update_income_source: {
    title: 'Update income source',
    fields: [
      { key: 'ownerName', label: 'Member' },
      { key: 'employerName', label: 'Employer or source' },
      { key: 'amount', label: 'Amount' },
      { key: 'frequency', label: 'Frequency' },
    ],
  },
  set_current_coverage: {
    title: 'Set current coverage',
    fields: [
      { key: 'memberNames', label: 'Members' },
      { key: 'status', label: 'Coverage status' },
      { key: 'providerName', label: 'Provider' },
      { key: 'planName', label: 'Plan' },
    ],
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeText(value: string): string {
  return Array.from(value)
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint > 0x1f && codePoint !== 0x7f;
    })
    .join('')
    .trim()
    .slice(0, MAX_DISPLAY_VALUE_LENGTH);
}

function titleCase(value: string): string {
  return value.length > 0
    ? `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`
    : value;
}

function displayValue(key: string, value: unknown): string | undefined {
  if (key === 'amount' && typeof value === 'number' && Number.isFinite(value)) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  }

  if (
    key === 'ageYears' &&
    typeof value === 'number' &&
    Number.isFinite(value)
  ) {
    return String(value);
  }

  if (key === 'applyingForCoverage' && typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (key === 'status' && typeof value === 'string') {
    if (value === 'none') return 'No current coverage';
    if (value === 'covered') return 'Currently covered';
  }

  if (key === 'frequency' && typeof value === 'string') {
    const labels: Record<string, string> = {
      weekly: 'Weekly',
      biweekly: 'Every two weeks',
      monthly: 'Monthly',
      annual: 'Annually',
    };
    return labels[value];
  }

  if (key === 'relationship' && typeof value === 'string') {
    return titleCase(sanitizeText(value));
  }

  if (typeof value === 'string') {
    const sanitized = sanitizeText(value);
    return sanitized || undefined;
  }

  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
    const sanitized = value
      .map((item) => sanitizeText(item))
      .filter(Boolean)
      .join(', ');
    return sanitized || undefined;
  }

  return undefined;
}

export function createConfirmationDraft(
  toolName: string,
  argumentsValue: unknown,
): ConfirmationDraft | undefined {
  if (toolName === 'review_application') {
    return {
      title: 'Review application',
      fields: [{ label: 'Action', value: 'Review application' }],
    };
  }

  const configuration = DRAFTS[toolName];
  if (!configuration || !isRecord(argumentsValue)) return undefined;

  const fields: ConfirmationDraftField[] = [];
  for (const field of configuration.fields) {
    const value = displayValue(field.key, argumentsValue[field.key]);
    if (value !== undefined) fields.push({ label: field.label, value });
  }

  return { title: configuration.title, fields };
}

export function createEffectiveConfirmationDraft(
  toolName: string,
  argumentsValue: unknown,
  context: EffectiveConfirmationDraftContext = {},
): ConfirmationDraft | undefined {
  if (!isRecord(argumentsValue)) {
    return createConfirmationDraft(toolName, argumentsValue);
  }

  let effectiveArguments = argumentsValue;
  if (
    toolName === 'add_household_member' &&
    typeof context.applicantLastName === 'string' &&
    context.applicantLastName.trim() &&
    typeof argumentsValue.lastName !== 'string'
  ) {
    effectiveArguments = {
      ...argumentsValue,
      lastName: context.applicantLastName,
    };
  }

  if (toolName === 'update_household_member') {
    const member = context.selectedHouseholdMember;
    if (member) {
      effectiveArguments = { ...member, ...argumentsValue };
    }
  }

  if (toolName === 'update_income_source') {
    const incomeSource = context.selectedIncomeSource;
    if (incomeSource) {
      effectiveArguments = { ...incomeSource, ...argumentsValue };
    }
  }

  return createConfirmationDraft(toolName, effectiveArguments);
}
