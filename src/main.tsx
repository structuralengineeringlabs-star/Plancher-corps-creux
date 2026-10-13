import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import ErrorBoundary from './ErrorBoundary';
import { installGlobalHandlers } from './diagnostics';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import './index.css';

installGlobalHandlers();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary scope="application"><App /></ErrorBoundary>
  </StrictMode>,
);
