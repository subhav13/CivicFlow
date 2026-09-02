import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

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
import { FIRST_RUN_PROMPTS } from '../onboarding/FirstRunGuide';
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
  onControllerEvent?: (event: AssistantControllerEvent) => void;
  initialMode?: AssistantMode;
  onListeningChange?: (isListening: boolean) => void;
  onSpeakingChange?: (isSpeaking: boolean) => void;
}

export type AssistantMode = 'unselected' | 'chat' | 'voice';

export interface AssistantPanelHandle {
  stopListening(): void;
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

export const AssistantPanel = forwardRef<
  AssistantPanelHandle,
  AssistantPanelProps
>(function AssistantPanel(
  {
    controller = null,
    enabled = true,
    onReadCurrentSection,
    speechOutput,
    activeOperation = null,
    renderConfirmation = true,
    onControllerEvent,
    initialMode = 'chat',
    onListeningChange,
    onSpeakingChange,
  },
  ref,
) {
  const activeSpeechOutput = speechOutput ?? browserSpeechOutput;

  const [sessionState, setSessionState] = useState<SessionState>(() =>
    controller ? controller.getState() : { status: 'idle' },
  );
  const [messages, setMessages] = useState<TimelineMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [speechAloud, setSpeechAloud] = useState(false);
  const [speechRate, setSpeechRate] = useState(1);
  const [assistantMode, setAssistantMode] =
    useState<AssistantMode>(initialMode);
  const [composerText, setComposerText] = useState('');
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
  const speakerMutedRef = useRef(speakerMuted);
  speakerMutedRef.current = speakerMuted;
  const activeSpeechOutputRef = useRef(activeSpeechOutput);
  activeSpeechOutputRef.current = activeSpeechOutput;
  const onControllerEventRef = useRef(onControllerEvent);
  onControllerEventRef.current = onControllerEvent;
  const onListeningChangeRef = useRef(onListeningChange);
  onListeningChangeRef.current = onListeningChange;
  const onSpeakingChangeRef = useRef(onSpeakingChange);
  onSpeakingChangeRef.current = onSpeakingChange;
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
      updateListening(false);
      setIsThinking(false);
      updateSpeaking(false);
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
        if (!speakerMutedRef.current && speechAloudRef.current) {
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
        onControllerEventRef.current?.(event);
        switch (event.type) {
          case 'state':
            setSessionState(event.state);
            if (event.state.status !== 'connected') {
              resetLiveTurn();
              updateListening(false);
              setIsThinking(false);
              updateSpeaking(false);
              setPendingConfirmation(null);
              activeSpeechOutputRef.current.cancel();
            }
            break;
          case 'error':
            resetLiveTurn();
            updateListening(false);
            setIsThinking(false);
            updateSpeaking(false);
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
            updateSpeaking(!speakerMutedRef.current);
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
            updateSpeaking(false);
            break;

          case 'revision_requested':
            setPendingConfirmation(null);
            setIsThinking(false);
            updateSpeaking(false);
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
            updateSpeaking(false);
            break;
          }

          case 'failed': {
            if (handledFailureEvents.has(event)) break;
            handledFailureEvents.add(event);
            const failureMessage = `I couldn't apply that change: ${event.message}`;
            setIsThinking(false);
            updateSpeaking(false);
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
            updateSpeaking(false);
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

  const updateListening = (next: boolean) => {
    setIsListening(next);
    onListeningChangeRef.current?.(next);
  };

  const updateSpeaking = (next: boolean) => {
    setIsSpeaking(next);
    onSpeakingChangeRef.current?.(next);
  };

  const ensureConnected = async (): Promise<boolean> => {
    if (!controller || !enabled) return false;
    if (controller.getState().status !== 'connected') {
      await controller.connect();
    }
    return controller.getState().status === 'connected';
  };

  const handleStopListening = () => {
    controller?.stopMicrophone();
    updateListening(false);
  };

  useImperativeHandle(ref, () => ({ stopListening: handleStopListening }));

  const handleSelectChat = async () => {
    setAssistantMode('chat');
    await ensureConnected();
  };

  const handleSelectVoice = async () => {
    setAssistantMode('voice');
    if (!(await ensureConnected())) return;
    updateListening(true);
    await controller?.startMicrophone();
  };

  const handleSendText = (text: string) => {
    if (!controller || !isConnected) return;
    if (assistantMode === 'unselected') {
      setAssistantMode('chat');
    }
    setIsThinking(true);
    updateSpeaking(false);
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
      handleStopListening();
    } else {
      updateListening(true);
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
    if (!speakerMuted && latestAssistantText) {
      activeSpeechOutput.speak(latestAssistantText, speechRate);
    }
  };

  const handleSpeakSlower = () => {
    setSpeechRate(0.75);
    if (!speakerMuted && latestAssistantText) {
      activeSpeechOutput.speak(latestAssistantText, 0.75);
    }
  };

  const handleToggleSpeakerMuted = () => {
    const nextMuted = !speakerMuted;
    setSpeakerMuted(nextMuted);
    controller?.setSpeakerMuted?.(nextMuted);
    if (nextMuted) {
      updateSpeaking(false);
      activeSpeechOutputRef.current.cancel();
    }
  };

  const handleClearConversation = () => {
    liveTurnAssemblerRef.current.reset();
    setMessages([]);
    setLatestAssistantText('');
    setComposerText('');
    activeSpeechOutput.cancel();
  };

  const handleToggleLive = async () => {
    if (!controller || !enabled) return;
    if (
      sessionState.status === 'connected' ||
      sessionState.status === 'connecting'
    ) {
      controller.disconnect();
      handleStopListening();
      setIsThinking(false);
      updateSpeaking(false);
      setPendingConfirmation(null);
      activeSpeechOutputRef.current.cancel();
    } else {
      await controller.connect();
    }
  };

  const showWelcomeChoice =
    assistantMode === 'unselected' && isSessionAvailable;
  const composerDisabled =
    !isSessionAvailable || (!isConnected && assistantMode !== 'unselected');
  const composerSendDisabled = !isConnected;

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
        {!showWelcomeChoice ? (
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
        ) : null}
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
      {showWelcomeChoice ? (
        <div
          className="assistant-welcome-choice"
          role="group"
          aria-label="Choose how to use the assistant"
        >
          <div>
            <strong>How would you like to work?</strong>
            <p>
              Choose voice for hands-free help or keep the conversation in chat.
            </p>
          </div>
          <div className="assistant-welcome-actions">
            <button type="button" onClick={() => void handleSelectVoice()}>
              Start voice
            </button>
            <button type="button" onClick={() => void handleSelectChat()}>
              Continue with chat
            </button>
          </div>
        </div>
      ) : null}
      <ConversationTimeline messages={messages} />

      {isConnected && messages.length === 0 ? (
        <div
          className="assistant-suggestions"
          data-testid="assistant-suggestions"
          aria-label="Suggested prompts"
        >
          <span className="assistant-suggestions-label">Try a suggestion</span>
          <div className="assistant-suggestions-list">
            {FIRST_RUN_PROMPTS.map((prompt) => (
              <button
                key={prompt.id}
                type="button"
                className="assistant-suggestion-button"
                onClick={() => setComposerText(prompt.promptText)}
              >
                {prompt.title}
              </button>
            ))}
          </div>
        </div>
      ) : null}

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
        speakerMuted={speakerMuted}
        speechAloud={speechAloud}
        hasAssistantResponse={Boolean(latestAssistantText)}
        onToggleListening={handleToggleListening}
        onToggleSpeakerMuted={handleToggleSpeakerMuted}
        onReadCurrentSection={handleReadCurrentSection}
        onToggleSpeechAloud={setSpeechAloud}
        onRepeatSpeech={handleRepeatSpeech}
        onSpeakSlower={handleSpeakSlower}
      />

      <AssistantComposer
        value={composerText}
        onValueChange={setComposerText}
        onSend={handleSendText}
        disabled={composerDisabled}
        sendDisabled={composerSendDisabled}
      />
    </section>
  );
});
