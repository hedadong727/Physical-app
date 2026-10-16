import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

function initApp() {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('Fatal: root element #root not found in document!');
    return;
  }
  createRoot(rootElement).render(<App />);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
