import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/manrope';
import './index.css';
import App from './App';
import { requestPersistentStorage } from '@/services/storage';

// Ask the browser (silently, where supported) to protect PAWPASS data from eviction.
void navigator.storage?.persisted?.().then((p) => {
  if (!p) void requestPersistentStorage();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
