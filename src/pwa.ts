const canRegisterServiceWorker = 'serviceWorker' in navigator && import.meta.env.PROD;

if (canRegisterServiceWorker) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js');
  });
}
