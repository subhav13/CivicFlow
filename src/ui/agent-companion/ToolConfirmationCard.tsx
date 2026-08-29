import type { ConfirmationDraft } from '../../assistant/tool-confirmation-view-model';

export interface PendingToolConfirmation {
  callId: string;
  toolName: string;
  message: string;
  draft?: ConfirmationDraft;
}

export interface ToolConfirmationCardProps {
  confirmation: PendingToolConfirmation;
  onConfirm: (callId: string) => void;
  onNeedCorrection: (callId: string) => void;
  onCancel: (callId: string) => void;
  disabled?: boolean;
}

export function ToolConfirmationCard({
  confirmation,
  onConfirm,
  onNeedCorrection,
  onCancel,
  disabled = false,
}: ToolConfirmationCardProps) {
  return (
    <div className="tool-confirmation-card" role="alert">
      <div className="tool-confirmation-header">
        <span className="tool-confirmation-badge">Confirmation required</span>
      </div>
      <p className="tool-confirmation-message">{confirmation.message}</p>
      <div className="tool-confirmation-actions">
        <button
          type="button"
          className="tool-confirm-button"
          onClick={() => onConfirm(confirmation.callId)}
          disabled={disabled}
        >
          Confirm and apply
        </button>
        <button
          type="button"
          className="tool-correction-button"
          onClick={() => onNeedCorrection(confirmation.callId)}
          disabled={disabled}
        >
          Need correction
        </button>
        <button
          type="button"
          className="tool-cancel-button"
          onClick={() => onCancel(confirmation.callId)}
          disabled={disabled}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
