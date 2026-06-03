import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './fonts';
import './index.css';

// Pedir almacenamiento persistente para que los bocetos (IndexedDB) NO se borren:
// sin esto el navegador puede desalojarlos al liberar espacio. Con persist() quedan
// para siempre en este origen (placas-app.vercel.app).
if (navigator.storage?.persist) {
  navigator.storage.persisted().then((already) => {
    if (!already) navigator.storage.persist();
  }).catch(() => {});
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
