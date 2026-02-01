import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import router from './router';
import { ToastProvider } from './components/Toast';
import { AuthProvider } from './contexts/AuthContext';
import './i18n'; // Initialize i18n
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>,
);


// Service Worker disabled until caching issues are resolved
// Register Service Worker for PWA
/*
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Use relative path for GitHub Pages compatibility
    const swPath = import.meta.env.BASE_URL + 'sw.js';
    navigator.serviceWorker.register(swPath)
      .then((registration) => {
        console.log('SW registered:', registration);
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  });
}
*/

// Unregister any existing service workers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function (registrations) {
    for (let registration of registrations) {
      registration.unregister();
      console.log('Unregistered service worker:', registration.scope);
    }
  });
}
