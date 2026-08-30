/// <reference types="vite/client" />
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app/App';
import { resolveAssistantEnabled } from './app/client-voice-gate';
import './styles.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('CivicFlow root element is unavailable.');
}

const assistantEnabled = resolveAssistantEnabled(import.meta.env);

createRoot(rootElement).render(
  <StrictMode>
    <App assistantEnabled={assistantEnabled} />
  </StrictMode>,
);
