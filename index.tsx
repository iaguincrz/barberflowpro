
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const mountApp = () => {
  if (typeof window === 'undefined') return;

  const rootElement = document.getElementById('root');
  
  if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } else {
    // Caso o script carregue antes do DOM estar pronto, tenta novamente em curto intervalo
    setTimeout(mountApp, 10);
  }
};

mountApp();
