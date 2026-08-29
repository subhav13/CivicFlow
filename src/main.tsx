/// <reference types="vite/client" />
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app/App';
import './styles.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('CivicFlow root element is unavailable.');
}

const liveAuditEnabled =
  import.meta.env.DEV && import.meta.env.VITE_CIVICFLOW_LIVE_AUDIT === '1';

createRoot(rootElement).render(
  <StrictMode>
    <App assistantEnabled={liveAuditEnabled} />
  </StrictMode>,
);
