import { useState, type FormEvent } from 'react';

import { updateApplicant } from '../../application/commands';
import { TextField } from '../components/FormField';
import {
  ActionFeedback,
  PrimaryButton,
  SectionHeader,
  SectionPanel,
} from '../components/SectionPrimitives';
import type { BaseSectionProps } from '../types';

interface AboutDraft {
  firstName: string;
  lastName: string;
  ageYears: string;
  email: string;
  phone: string;
  addressLine1: string;
  city: string;
  postalCode: string;
  applyingForCoverage: boolean;
}

type AboutErrors = Partial<Record<keyof AboutDraft, string>>;

function draftFromApplicant(
  application: BaseSectionProps['application'],
): AboutDraft {
  const applicant = application.applicant;
  return {
    firstName: applicant.firstName,
    lastName: applicant.lastName,
    ageYears: String(applicant.ageYears),
    email: applicant.email,
    phone: applicant.phone,
    addressLine1: applicant.addressLine1,
    city: applicant.city,
    postalCode: applicant.postalCode,
    applyingForCoverage: applicant.applyingForCoverage,
  };
}

function validateDraft(draft: AboutDraft): AboutErrors {
  const errors: AboutErrors = {};
  const requiredFields: Array<
    keyof Pick<
      AboutDraft,
      | 'firstName'
      | 'lastName'
      | 'email'
      | 'phone'
      | 'addressLine1'
      | 'city'
      | 'postalCode'
    >
  > = [
    'firstName',
    'lastName',
    'email',
    'phone',
    'addressLine1',
    'city',
    'postalCode',
  ];
  for (const field of requiredFields) {
    if (draft[field].trim().length === 0)
      errors[field] =
        `${field === 'firstName' ? 'First name' : field === 'lastName' ? 'Last name' : field === 'addressLine1' ? 'Address' : field === 'postalCode' ? 'Postal code' : field[0]?.toUpperCase() + field.slice(1)} is required.`;
  }
  const age = Number(draft.ageYears);
  if (
    !/^\d+$/u.test(draft.ageYears.trim()) ||
    !Number.isInteger(age) ||
    age < 0 ||
    age > 130
  ) {
    errors.ageYears = 'Age must be a whole number from 0 to 130.';
  }
  if (draft.email.trim().length > 0 && !draft.email.includes('@')) {
    errors.email = 'Enter a valid email address.';
  }
  return errors;
}

export function AboutSection({
  application,
  dispatch,
  disabled,
}: BaseSectionProps) {
  const [draft, setDraft] = useState(() => draftFromApplicant(application));
  const [errors, setErrors] = useState<AboutErrors>({});
  const [receipt, setReceipt] = useState<ReturnType<
    BaseSectionProps['dispatch']
  > | null>(null);

  function updateDraft<K extends keyof AboutDraft>(
    field: K,
    value: AboutDraft[K],
  ) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateDraft(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setReceipt(null);
      return;
    }
    const nextReceipt = dispatch(
      (state, context) =>
        updateApplicant(
          state,
          {
            changes: {
              firstName: draft.firstName,
              lastName: draft.lastName,
              ageYears: Number(draft.ageYears),
              email: draft.email,
              phone: draft.phone,
              addressLine1: draft.addressLine1,
              city: draft.city,
              postalCode: draft.postalCode,
              applyingForCoverage: draft.applyingForCoverage,
            },
          },
          context,
        ),
      {
        activity: {
          id: 'human-about-save',
          summary: 'Updated applicant details',
        },
      },
    );
    setReceipt(nextReceipt);
  }

  return (
    <div className="section-content">
      <SectionHeader
        description="Tell us about the person starting this synthetic application."
        eyebrow="Start with the basics"
        title="About You"
      />
      <SectionPanel tone="soft">
        <div className="panel-heading-row">
          <div>
            <h3>Your profile</h3>
            <p className="helper-copy">
              These details stay in this browser for the demo.
            </p>
          </div>
          <span className="completion-pill">Ready</span>
        </div>
        <form className="form-grid" noValidate onSubmit={handleSubmit}>
          <TextField
            autoComplete="given-name"
            disabled={disabled}
            error={errors.firstName}
            id="about-first-name"
            label="First name"
            onChange={(event) => updateDraft('firstName', event.target.value)}
            required
            value={draft.firstName}
          />
          <TextField
            autoComplete="family-name"
            disabled={disabled}
            error={errors.lastName}
            id="about-last-name"
            label="Last name"
            onChange={(event) => updateDraft('lastName', event.target.value)}
            required
            value={draft.lastName}
          />
          <TextField
            disabled={disabled}
            error={errors.ageYears}
            id="about-age"
            inputMode="numeric"
            label="Age"
            min={0}
            onChange={(event) => updateDraft('ageYears', event.target.value)}
            required
            type="number"
            value={draft.ageYears}
          />
          <TextField
            autoComplete="email"
            disabled={disabled}
            error={errors.email}
            id="about-email"
            label="Email"
            onChange={(event) => updateDraft('email', event.target.value)}
            required
            type="email"
            value={draft.email}
          />
          <TextField
            autoComplete="tel"
            disabled={disabled}
            error={errors.phone}
            id="about-phone"
            label="Phone"
            onChange={(event) => updateDraft('phone', event.target.value)}
            required
            value={draft.phone}
          />
          <TextField
            autoComplete="street-address"
            disabled={disabled}
            error={errors.addressLine1}
            id="about-address"
            label="Address"
            onChange={(event) =>
              updateDraft('addressLine1', event.target.value)
            }
            required
            value={draft.addressLine1}
          />
          <TextField
            autoComplete="address-level2"
            disabled={disabled}
            error={errors.city}
            id="about-city"
            label="City"
            onChange={(event) => updateDraft('city', event.target.value)}
            required
            value={draft.city}
          />
          <TextField disabled id="about-state" label="State" value="MA" />
          <TextField
            autoComplete="postal-code"
            disabled={disabled}
            error={errors.postalCode}
            id="about-postal-code"
            label="Postal code"
            onChange={(event) => updateDraft('postalCode', event.target.value)}
            required
            value={draft.postalCode}
          />
          <label className="checkbox-row" htmlFor="about-applying">
            <input
              checked={draft.applyingForCoverage}
              disabled={disabled}
              id="about-applying"
              onChange={(event) =>
                updateDraft('applyingForCoverage', event.target.checked)
              }
              type="checkbox"
            />
            <span>
              <strong>I am applying for coverage</strong>
              <small>
                Maya is the primary person on this synthetic application.
              </small>
            </span>
          </label>
          <div className="form-actions form-actions-wide">
            <PrimaryButton disabled={disabled}>Save About You</PrimaryButton>
          </div>
        </form>
        {Object.keys(errors).length > 0 ? (
          <div className="validation-summary" role="alert">
            <strong>Check the highlighted fields.</strong>
            <span>{Object.values(errors).filter(Boolean).join(' ')}</span>
          </div>
        ) : null}
        <ActionFeedback receipt={receipt} />
      </SectionPanel>
    </div>
  );
}
