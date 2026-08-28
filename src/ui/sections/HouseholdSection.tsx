import { useState, type FormEvent } from 'react';

import {
  addHouseholdMember,
  confirmHousehold,
  updateHouseholdMember,
} from '../../application/commands';
import { RELATIONSHIPS, type Relationship } from '../../domain';
import type { RecentEffect } from '../../application/store';
import { TextField, SelectField } from '../components/FormField';
import {
  ActionFeedback,
  EmptyState,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  SectionPanel,
} from '../components/SectionPrimitives';
import type { BaseSectionProps } from '../types';

interface MemberDraft {
  firstName: string;
  lastName: string;
  ageYears: string;
  relationship: Exclude<Relationship, 'self'>;
  applyingForCoverage: boolean;
}

type MemberErrors = Partial<Record<keyof MemberDraft, string>>;

const relationshipLabels: Record<Exclude<Relationship, 'self'>, string> = {
  spouse: 'Spouse',
  son: 'Son',
  daughter: 'Daughter',
  child: 'Child',
  dependent: 'Dependent',
  other: 'Other',
};

const emptyDraft = (): MemberDraft => ({
  firstName: '',
  lastName: '',
  ageYears: '',
  relationship: 'daughter',
  applyingForCoverage: true,
});

function validateMember(draft: MemberDraft): MemberErrors {
  const errors: MemberErrors = {};
  if (!draft.firstName.trim()) errors.firstName = 'First name is required.';
  if (!draft.lastName.trim()) errors.lastName = 'Last name is required.';
  const age = Number(draft.ageYears);
  if (
    !/^\d+$/u.test(draft.ageYears.trim()) ||
    !Number.isInteger(age) ||
    age > 130
  ) {
    errors.ageYears = 'Age must be a whole number from 0 to 130.';
  }
  return errors;
}

function selectedDraftFromMember(member: {
  firstName: string;
  lastName: string;
  ageYears: number;
  relationship: Relationship;
  applyingForCoverage: boolean;
}): MemberDraft {
  return {
    firstName: member.firstName,
    lastName: member.lastName,
    ageYears: String(member.ageYears),
    relationship:
      member.relationship === 'self' ? 'other' : member.relationship,
    applyingForCoverage: member.applyingForCoverage,
  };
}

interface HouseholdSectionProps extends BaseSectionProps {
  onSelect: (id: string | null) => void;
  selectedId: string | null;
  recentEffect?: RecentEffect | null;
}
export function HouseholdSection({
  application,
  dispatch,
  disabled,
  onSelect,
  selectedId,
  recentEffect,
}: HouseholdSectionProps) {
  const [draft, setDraft] = useState<MemberDraft>(emptyDraft);
  const [editDraft, setEditDraft] = useState<MemberDraft | null>(null);
  const [errors, setErrors] = useState<MemberErrors>({});
  const [editErrors, setEditErrors] = useState<MemberErrors>({});
  const [receipt, setReceipt] = useState<ReturnType<
    BaseSectionProps['dispatch']
  > | null>(null);
  const [confirmationNotice, setConfirmationNotice] = useState<string | null>(
    null,
  );

  function selectMember(id: string) {
    const member = application.householdMembers.find(
      (candidate) => candidate.id === id,
    );
    if (!member) return;
    onSelect(selectedId === id ? null : id);
    setEditDraft(selectedId === id ? null : selectedDraftFromMember(member));
    setEditErrors({});
  }

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateMember(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    const nextReceipt = dispatch(
      (state, context) =>
        addHouseholdMember(
          state,
          {
            firstName: draft.firstName,
            lastName: draft.lastName,
            ageYears: Number(draft.ageYears),
            relationship: draft.relationship,
            applyingForCoverage: draft.applyingForCoverage,
          },
          context,
        ),
      {
        activity: {
          id: 'human-household-add',
          summary: 'Added household member',
        },
      },
    );
    setReceipt(nextReceipt);
    if (nextReceipt.kind === 'success' && nextReceipt.changed) {
      setDraft(emptyDraft());
      setErrors({});
    }
  }

  function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId || !editDraft) return;
    const nextErrors = validateMember(editDraft);
    setEditErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    const nextReceipt = dispatch(
      (state, context) =>
        updateHouseholdMember(
          state,
          {
            personId: selectedId,
            changes: {
              firstName: editDraft.firstName,
              lastName: editDraft.lastName,
              ageYears: Number(editDraft.ageYears),
              relationship: editDraft.relationship,
              applyingForCoverage: editDraft.applyingForCoverage,
            },
          },
          context,
        ),
      {
        activity: {
          id: 'human-household-edit',
          summary: 'Updated household member',
        },
      },
    );
    setReceipt(nextReceipt);
  }

  function handleConfirm() {
    const nextReceipt = dispatch(
      (state, context) => confirmHousehold(state, context),
      {
        activity: {
          id: 'human-household-confirm',
          summary: 'Confirmed household details',
        },
      },
    );
    setReceipt(nextReceipt);
    if (nextReceipt.kind === 'success')
      setConfirmationNotice('Household confirmed.');
  }

  const relationshipOptions = RELATIONSHIPS.filter(
    (relationship): relationship is Exclude<Relationship, 'self'> =>
      relationship !== 'self',
  );

  return (
    <div className="section-content">
      <SectionHeader
        description="Add everyone who belongs in this synthetic household, then confirm the list."
        eyebrow="People in the home"
        title="Household"
      />

      <SectionPanel title="Household members" tone="soft">
        {application.householdMembers.length === 0 ? (
          <EmptyState>
            <strong>No additional members yet.</strong>
            <span>
              Add Emma or confirm that Maya is the only person in this demo
              household.
            </span>
          </EmptyState>
        ) : (
          <div
            className="record-list"
            role="list"
            aria-label="Household members"
          >
            {application.householdMembers.map((member) => {
              const name = `${member.firstName} ${member.lastName}`;
              const isSelected = selectedId === member.id;
              const isRecent = Boolean(
                recentEffect?.entityIds.includes(member.id),
              );
              return (
                <article
                  className={`record-card${isSelected ? ' is-selected' : ''}${isRecent ? ' is-recent-effect' : ''}`}
                  key={member.id}
                  role="listitem"
                  data-entity-id={member.id}
                  data-recent-effect={isRecent ? recentEffect?.kind : undefined}
                  data-recent-action-id={
                    isRecent ? recentEffect?.actionId : undefined
                  }
                >
                  <button
                    aria-label={`${isSelected ? 'Deselect' : 'Select'} ${name}`}
                    aria-pressed={isSelected}
                    className="record-select-button"
                    onClick={() => selectMember(member.id)}
                    type="button"
                  >
                    <span className="record-avatar" aria-hidden="true">
                      {member.firstName.slice(0, 1)}
                      {member.lastName.slice(0, 1)}
                    </span>
                    <span className="record-card-copy">
                      <strong>{name}</strong>
                      <small>
                        {member.relationship === 'self'
                          ? 'Self'
                          : relationshipLabels[member.relationship]}{' '}
                        · age {member.ageYears}
                      </small>
                    </span>
                    <span className="record-card-action">
                      {isSelected ? 'Selected' : 'Select'}
                    </span>
                  </button>
                  {isSelected && editDraft ? (
                    <form
                      className="inline-edit-form"
                      noValidate
                      onSubmit={handleUpdate}
                    >
                      <div className="form-grid">
                        <TextField
                          disabled={disabled}
                          error={editErrors.firstName}
                          id="selected-member-first-name"
                          label="Selected member first name"
                          onChange={(event) =>
                            setEditDraft((current) =>
                              current
                                ? { ...current, firstName: event.target.value }
                                : current,
                            )
                          }
                          value={editDraft.firstName}
                        />
                        <TextField
                          disabled={disabled}
                          error={editErrors.lastName}
                          id="selected-member-last-name"
                          label="Selected member last name"
                          onChange={(event) =>
                            setEditDraft((current) =>
                              current
                                ? { ...current, lastName: event.target.value }
                                : current,
                            )
                          }
                          value={editDraft.lastName}
                        />
                        <TextField
                          disabled={disabled}
                          error={editErrors.ageYears}
                          id="selected-member-age"
                          label="Selected member age"
                          onChange={(event) =>
                            setEditDraft((current) =>
                              current
                                ? { ...current, ageYears: event.target.value }
                                : current,
                            )
                          }
                          type="number"
                          value={editDraft.ageYears}
                        />
                        <SelectField
                          disabled={disabled}
                          id="selected-member-relationship"
                          label="Selected member relationship"
                          onChange={(event) =>
                            setEditDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    relationship: event.target
                                      .value as MemberDraft['relationship'],
                                  }
                                : current,
                            )
                          }
                          value={editDraft.relationship}
                        >
                          {relationshipOptions.map((relationship) => (
                            <option key={relationship} value={relationship}>
                              {relationshipLabels[relationship]}
                            </option>
                          ))}
                        </SelectField>
                      </div>
                      <label
                        className="checkbox-row"
                        htmlFor="selected-member-applying"
                      >
                        <input
                          checked={editDraft.applyingForCoverage}
                          disabled={disabled}
                          id="selected-member-applying"
                          onChange={(event) =>
                            setEditDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    applyingForCoverage: event.target.checked,
                                  }
                                : current,
                            )
                          }
                          type="checkbox"
                        />
                        <span>Applying for coverage</span>
                      </label>
                      <div className="form-actions">
                        <PrimaryButton disabled={disabled}>
                          Update selected household member
                        </PrimaryButton>
                        <SecondaryButton onClick={() => onSelect(null)}>
                          Deselect
                        </SecondaryButton>
                      </div>
                    </form>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}

        <form className="form-grid member-form" noValidate onSubmit={handleAdd}>
          <TextField
            disabled={disabled}
            error={errors.firstName}
            id="member-first-name"
            label="Household member first name"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                firstName: event.target.value,
              }))
            }
            value={draft.firstName}
          />
          <TextField
            disabled={disabled}
            error={errors.lastName}
            id="member-last-name"
            label="Household member last name"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                lastName: event.target.value,
              }))
            }
            value={draft.lastName}
          />
          <TextField
            disabled={disabled}
            error={errors.ageYears}
            id="member-age"
            label="Household member age"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                ageYears: event.target.value,
              }))
            }
            type="number"
            value={draft.ageYears}
          />
          <SelectField
            disabled={disabled}
            id="member-relationship"
            label="Household member relationship"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                relationship: event.target.value as MemberDraft['relationship'],
              }))
            }
            value={draft.relationship}
          >
            {relationshipOptions.map((relationship) => (
              <option key={relationship} value={relationship}>
                {relationshipLabels[relationship]}
              </option>
            ))}
          </SelectField>
          <label className="checkbox-row" htmlFor="member-applying">
            <input
              checked={draft.applyingForCoverage}
              disabled={disabled}
              id="member-applying"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  applyingForCoverage: event.target.checked,
                }))
              }
              type="checkbox"
            />
            <span>
              <strong>Member applying for coverage</strong>
              <small>Keep this selected for Emma’s golden-path demo.</small>
            </span>
          </label>
          <div className="form-actions form-actions-wide">
            <PrimaryButton disabled={disabled}>
              Add household member
            </PrimaryButton>
          </div>
        </form>

        <div className="confirmation-row">
          <div>
            <strong>Finished adding people?</strong>
            <span>Confirm the current list to mark this section complete.</span>
          </div>
          <SecondaryButton disabled={disabled} onClick={handleConfirm}>
            No other household members
          </SecondaryButton>
        </div>
        {confirmationNotice ? (
          <p className="inline-success" role="status">
            {confirmationNotice}
          </p>
        ) : null}
        <ActionFeedback receipt={receipt} />
      </SectionPanel>
    </div>
  );
}
