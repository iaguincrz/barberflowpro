
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const mountApp = () => {
  if (typeof window === 'undefined') return;

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.warn("Root element not found. This might happen during build or SSR.");
    return;
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

mountApp();
