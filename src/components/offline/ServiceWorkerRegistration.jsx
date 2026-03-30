/**
 * Service Worker Registration
 * Register service worker untuk PWA support
 */

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('✅ Service Worker registered successfully:', registration);

          // ✅ Check for updates every hour
          setInterval(() => {
            registration.update();
          }, 3600000);

          // ✅ Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('🆕 New Service Worker available - reload to update');
                
                // Notify user about update
                if (window.confirm('Versi baru aplikasi tersedia. Reload sekarang?')) {
                  window.location.reload();
                }
              }
            });
          });
        })
        .catch((error) => {
          console.warn('⚠️ Service Worker registration failed:', error);
        });

      // ✅ Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'BACKGROUND_SYNC') {
          console.log('🔄 Background sync triggered from service worker');
          window.dispatchEvent(new Event('triggerOfflineSync'));
        }
      });
    });
  } else {
    console.warn('⚠️ Service Workers not supported in this browser');
  }
}

export function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
        console.log('✅ Service Worker unregistered');
      })
      .catch((error) => {
        console.error('❌ Service Worker unregistration failed:', error);
      });
  }
}

// ✅ Check if app is running in standalone mode (PWA installed)
export function isPWAInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

// ✅ Request persistent storage (for larger offline cache)
export async function requestPersistentStorage() {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persist();
    console.log(`📦 Persistent storage ${isPersisted ? 'granted' : 'denied'}`);
    return isPersisted;
  }
  return false;
}