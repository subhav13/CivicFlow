import { useEffect, useRef, useState } from 'react';

import type {
  AssistantController,
  AssistantControllerEvent,
} from '../../assistant/assistant-controller';
import {
  createConfirmationDraft,
  createConfirmationNarration,
} from '../../assistant/tool-confirmation-view-model';
import {
  createLiveTurnAssembler,
  type LiveTurnAssembler,
} from '../../assistant/live-turn-assembler';
import type { SessionState } from '../../assistant/session-state';
import type { OperationState } from '../../application/operation-feedback';
import { AssistantComposer } from './AssistantComposer';
import { AssistantStatus } from './AssistantStatus';
import {
  ConversationTimeline,
  type TimelineMessage,
} from './ConversationTimeline';
import {
  ToolConfirmationCard,
  type PendingToolConfirmation,
} from './ToolConfirmationCard';
import { VoiceControls } from './VoiceControls';
import { browserSpeechOutput, type SpeechOutputService } from './speech-output';

export interface AssistantPanelProps {
  controller?: AssistantController | null;
  enabled?: boolean;
  onReadCurrentSection?: () => string;
  speechOutput?: SpeechOutputService;
  activeOperation?: OperationState | null;
  renderConfirmation?: boolean;
}

let msgCounter = 0;
function createMessageId(prefix: string): string {
  msgCounter += 1;
  return `${prefix}-${Date.now()}-${msgCounter}`;
}

const LIVE_USER_MESSAGE_ID = 'live-user-turn';
const LIVE_ASSISTANT_MESSAGE_ID = 'live-assistant-turn';
const CORRECTION_PROMPT =
  'Tell me what needs to change. I will show the updated draft for review before anything is applied.';
const handledFailureEvents = new WeakSet<object>();

function isAssistantPanelVisible(element: HTMLElement | null): boolean {
  if (!element || typeof window === 'undefined') return true;
  if (typeof window.getComputedStyle !== 'function') return true;

  let current: HTMLElement | null = element;
  while (current) {
    const style = window.getComputedStyle(current);
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.visibility === 'collapse'
    ) {
      return false;
    }
    current = current.parentElement;
  }
  return true;
}

export function AssistantPanel({
  controller = null,
  enabled = true,
  onReadCurrentSection,
  speechOutput,
  activeOperation = null,
  renderConfirmation = true,
}: AssistantPanelProps) {
  const activeSpeechOutput = speechOutput ?? browserSpeechOutput;

  const [sessionState, setSessionState] = useState<SessionState>(() =>
    controller ? controller.getState() : { status: 'idle' },
  );
  const [messages, setMessages] = useState<TimelineMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechAloud, setSpeechAloud] = useState(false);
  const [speechRate, setSpeechRate] = useState(1);
  const [latestAssistantText, setLatestAssistantText] = useState<string>('');
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingToolConfirmation | null>(null);
  const liveTurnAssemblerRef = useRef<LiveTurnAssembler>(
    createLiveTurnAssembler(),
  );
  const panelRef = useRef<HTMLElement>(null);
  const speechAloudRef = useRef(speechAloud);
  speechAloudRef.current = speechAloud;
  const speechRateRef = useRef(speechRate);
  speechRateRef.current = speechRate;
  const activeSpeechOutputRef = useRef(activeSpeechOutput);
  activeSpeechOutputRef.current = activeSpeechOutput;
  const isSessionAvailable = enabled && controller !== null;
  const isConnected = isSessionAvailable && sessionState.status === 'connected';
  const isLiveActive =
    isSessionAvailable &&
    (sessionState.status === 'connected' ||
      sessionState.status === 'connecting');

  useEffect(() => {
    if (!enabled && controller) {
      if (controller.getState().status !== 'idle') {
        controller.disconnect();
      }
      controller.stopMicrophone();
      setIsListening(false);
      setIsThinking(false);
      setIsSpeaking(false);
      setPendingConfirmation(null);
      liveTurnAssemblerRef.current.reset();
      setMessages((prev) =>
        prev.filter(
          (message) =>
            message.id !== LIVE_USER_MESSAGE_ID &&
            message.id !== LIVE_ASSISTANT_MESSAGE_ID,
        ),
      );
      activeSpeechOutputRef.current.cancel();
    }
  }, [enabled, controller]);
  useEffect(() => {
    const liveTurnAssembler = liveTurnAssemblerRef.current;
    if (!controller) {
      setSessionState({ status: 'idle' });
      liveTurnAssembler.reset();
      return;
    }

    setSessionState(controller.getState());

    const resetLiveTurn = () => {
      liveTurnAssembler.reset();
      setMessages((prev) =>
        prev.filter(
          (message) =>
            message.id !== LIVE_USER_MESSAGE_ID &&
            message.id !== LIVE_ASSISTANT_MESSAGE_ID,
        ),
      );
    };

    const renderLiveTurnDraft = () => {
      const snapshot = liveTurnAssembler.snapshot();
      if (snapshot.assistantText) {
        setLatestAssistantText(snapshot.assistantText);
      }
      setMessages((prev) => {
        const withoutDraft = prev.filter(
          (message) =>
            message.id !== LIVE_USER_MESSAGE_ID &&
            message.id !== LIVE_ASSISTANT_MESSAGE_ID,
        );
        if (snapshot.userText) {
          withoutDraft.push({
            id: LIVE_USER_MESSAGE_ID,
            role: 'user',
            text: snapshot.userText,
            interim: true,
          });
        }
        if (snapshot.assistantText) {
          withoutDraft.push({
            id: LIVE_ASSISTANT_MESSAGE_ID,
            role: 'assistant',
            text: snapshot.assistantText,
            interim: true,
          });
        }
        return withoutDraft;
      });
    };

    const commitLiveTurn = (interrupted: boolean) => {
      const committed = liveTurnAssembler.complete({ interrupted });
      setMessages((prev) => {
        const withoutDraft = prev.filter(
          (message) =>
            message.id !== LIVE_USER_MESSAGE_ID &&
            message.id !== LIVE_ASSISTANT_MESSAGE_ID,
        );
        if (committed.userText) {
          withoutDraft.push({
            id: createMessageId('user'),
            role: 'user',
            text: committed.userText,
          });
        }
        if (committed.assistantText) {
          withoutDraft.push({
            id: createMessageId('assistant'),
            role: 'assistant',
            text: committed.assistantText,
          });
        }
        return withoutDraft;
      });
      if (committed.assistantText) {
        setLatestAssistantText(committed.assistantText);
        if (speechAloudRef.current) {
          activeSpeechOutputRef.current.speak(
            committed.assistantText,
            speechRateRef.current,
          );
        }
      }
      return committed;
    };

    const unsubscribe = controller.subscribe(
      (event: AssistantControllerEvent) => {
        switch (event.type) {
          case 'state':
            setSessionState(event.state);
            if (event.state.status !== 'connected') {
              resetLiveTurn();
              setIsListening(false);
              setIsThinking(false);
              setIsSpeaking(false);
              setPendingConfirmation(null);
              activeSpeechOutputRef.current.cancel();
            }
            break;
          case 'error':
            resetLiveTurn();
            setIsListening(false);
            setIsThinking(false);
            setIsSpeaking(false);
            setPendingConfirmation(null);
            activeSpeechOutputRef.current.cancel();
            break;
          case 'transcript': {
            if (event.speaker === 'user') {
              liveTurnAssemblerRef.current.addUserTranscript(event.text);
            } else {
              liveTurnAssemblerRef.current.addModelTranscript(event.text);
            }
            renderLiveTurnDraft();
            break;
          }

          case 'audio':
            setIsSpeaking(true);
            setIsThinking(false);
            break;

          case 'text':
            liveTurnAssemblerRef.current.addModelText(event.text);
            renderLiveTurnDraft();
            break;

          case 'confirmation_required':
            {
              const committed = commitLiveTurn(false);
              if (!committed.assistantText) {
                const narration = createConfirmationNarration(event.draft);
                setLatestAssistantText(narration);
                setMessages((prev) => [
                  ...prev,
                  {
                    id: createMessageId('assistant-review'),
                    role: 'assistant',
                    text: narration,
                  },
                ]);
              }
            }
            setIsThinking(false);
            setPendingConfirmation({
              callId: event.callId,
              toolName: event.toolName,
              message: event.message,
              draft: event.draft ??
                createConfirmationDraft(event.toolName, {}) ?? {
                  title: 'Proposed change',
                  fields: [],
                },
            });
            break;

          case 'applying':
            setIsThinking(true);
            setIsSpeaking(false);
            break;

          case 'revision_requested':
            setPendingConfirmation(null);
            setIsThinking(false);
            setIsSpeaking(false);
            setLatestAssistantText(CORRECTION_PROMPT);
            setMessages((prev) => [
              ...prev.filter(
                (message) =>
                  message.id !== LIVE_USER_MESSAGE_ID &&
                  message.id !== LIVE_ASSISTANT_MESSAGE_ID,
              ),
              {
                id: createMessageId('assistant'),
                role: 'assistant',
                text: CORRECTION_PROMPT,
              },
            ]);
            break;

          case 'succeeded': {
            setPendingConfirmation(null);
            setIsThinking(false);
            setIsSpeaking(false);
            break;
          }

          case 'failed': {
            if (!isAssistantPanelVisible(panelRef.current)) break;
            if (handledFailureEvents.has(event)) break;
            handledFailureEvents.add(event);
            const failureMessage = `I couldn't apply that change: ${event.message}`;
            setIsThinking(false);
            setIsSpeaking(false);
            setLatestAssistantText(failureMessage);
            setMessages((prev) => [
              ...prev.filter(
                (message) =>
                  message.id !== LIVE_USER_MESSAGE_ID &&
                  message.id !== LIVE_ASSISTANT_MESSAGE_ID,
              ),
              {
                id: createMessageId('assistant'),
                role: 'assistant',
                text: failureMessage,
              },
            ]);
            break;
          }

          case 'turn_complete':
            commitLiveTurn(Boolean(event.interrupted));
            setMessages((prev) => prev.filter((m) => !m.interim));
            setIsThinking(false);
            setIsSpeaking(false);
            break;
        }
      },
    );
    return () => {
      unsubscribe();
      liveTurnAssembler.reset();
      activeSpeechOutputRef.current.cancel();
    };
  }, [controller]);
  const handleSendText = (text: string) => {
    if (!controller || !isConnected) return;
    setIsThinking(true);
    setIsSpeaking(false);
    setMessages((prev) => [
      ...prev,
      {
        id: createMessageId('user'),
        role: 'user',
        text,
      },
    ]);
    controller.sendText(text);
  };

  const handleToggleListening = async () => {
    if (!controller || !isConnected) return;
    if (isListening) {
      controller.stopMicrophone();
      setIsListening(false);
    } else {
      setIsListening(true);
      await controller.startMicrophone();
    }
  };

  const handleReadCurrentSection = () => {
    if (onReadCurrentSection) {
      const sectionText = onReadCurrentSection();
      if (sectionText) {
        setMessages((prev) => [
          ...prev,
          {
            id: createMessageId('guidance'),
            role: 'guidance',
            text: sectionText,
          },
        ]);
      }
    }
  };

  const handleConfirmTool = async (callId: string) => {
    setPendingConfirmation(null);
    if (controller) {
      await controller.confirmToolCall(callId);
    }
  };

  const handleCancelTool = (callId: string) => {
    setPendingConfirmation(null);
    if (controller) {
      controller.cancelToolCall(callId);
    }
  };

  const handleNeedCorrection = (callId: string) => {
    if (!controller) return;
    controller.requestRevision(callId);
  };

  const handleRepeatSpeech = () => {
    if (latestAssistantText) {
      activeSpeechOutput.speak(latestAssistantText, speechRate);
    }
  };

  const handleSpeakSlower = () => {
    setSpeechRate(0.75);
    if (latestAssistantText) {
      activeSpeechOutput.speak(latestAssistantText, 0.75);
    }
  };

  const handleClearConversation = () => {
    liveTurnAssemblerRef.current.reset();
    setMessages([]);
    setLatestAssistantText('');
    activeSpeechOutput.cancel();
  };

  const handleToggleLive = async () => {
    if (!controller || !enabled) return;
    if (
      sessionState.status === 'connected' ||
      sessionState.status === 'connecting'
    ) {
      controller.disconnect();
      controller.stopMicrophone();
      setIsListening(false);
      setIsThinking(false);
      setIsSpeaking(false);
      setPendingConfirmation(null);
      activeSpeechOutputRef.current.cancel();
    } else {
      await controller.connect();
    }
  };

  return (
    <section
      ref={panelRef}
      className="assistant-panel"
      role="region"
      aria-label="Assistant panel"
    >
      <div className="assistant-panel-header">
        <div className="assistant-panel-header-top">
          <h3 className="assistant-panel-title">Voice &amp; Text Assistant</h3>
          <button
            type="button"
            className="assistant-clear-button"
            onClick={handleClearConversation}
          >
            Clear conversation
          </button>
        </div>
        <div className="assistant-live-switch-row">
          <button
            className="assistant-live-switch"
            type="button"
            role="switch"
            aria-label="Live voice assistant"
            aria-checked={isLiveActive}
            onClick={() => void handleToggleLive()}
            disabled={!isSessionAvailable}
          >
            <span
              className="assistant-live-switch-control"
              aria-hidden="true"
            />
            <span className="assistant-live-switch-text">
              Live Voice Assistant
            </span>
          </button>
          <span className="assistant-live-badge">Free Tier</span>
        </div>
        <AssistantStatus
          status={sessionState.status}
          enabled={isSessionAvailable}
          errorMessage={
            sessionState.status === 'error' ? sessionState.message : undefined
          }
          isListening={isListening}
          isThinking={isThinking}
          isSpeaking={isSpeaking}
          isConfirming={pendingConfirmation !== null}
          isApplying={activeOperation?.phase === 'applying'}
        />
      </div>
      <ConversationTimeline messages={messages} />

      {pendingConfirmation && renderConfirmation ? (
        <ToolConfirmationCard
          confirmation={pendingConfirmation}
          onConfirm={handleConfirmTool}
          onNeedCorrection={handleNeedCorrection}
          onCancel={handleCancelTool}
        />
      ) : null}

      <VoiceControls
        isListening={isListening}
        disabled={!isConnected}
        speechAloud={speechAloud}
        hasAssistantResponse={Boolean(latestAssistantText)}
        onToggleListening={handleToggleListening}
        onReadCurrentSection={handleReadCurrentSection}
        onToggleSpeechAloud={setSpeechAloud}
        onRepeatSpeech={handleRepeatSpeech}
        onSpeakSlower={handleSpeakSlower}
      />

      <AssistantComposer onSend={handleSendText} disabled={!isConnected} />
    </section>
  );
}
