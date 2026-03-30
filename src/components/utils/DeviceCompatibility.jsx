import { useEffect } from 'react';

export default function DeviceCompatibility() {
  useEffect(() => {
    // ✅ Device & Browser Detection
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
    const isAndroid = /android/i.test(userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);
    const isChrome = /chrome|chromium|crios/i.test(userAgent);
    const isFirefox = /firefox|fxios/i.test(userAgent);

    console.log('📱 Device Info:');
    console.log('   - Platform:', navigator.platform);
    console.log('   - User Agent:', userAgent);
    console.log('   - iOS:', isIOS);
    console.log('   - Android:', isAndroid);
    console.log('   - Safari:', isSafari);
    console.log('   - Chrome:', isChrome);
    console.log('   - Firefox:', isFirefox);
    console.log('   - Cookies Enabled:', navigator.cookieEnabled);
    console.log('   - Online:', navigator.onLine);

    // ✅ iOS Safari specific fixes
    if (isIOS && isSafari) {
      // Prevent zoom on input focus
      const metaViewport = document.querySelector('meta[name=viewport]');
      if (metaViewport) {
        metaViewport.setAttribute('content', 
          'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
        );
      }

      // Fix 100vh issue on iOS Safari
      const setVh = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      };
      setVh();
      window.addEventListener('resize', setVh);
      window.addEventListener('orientationchange', setVh);

      return () => {
        window.removeEventListener('resize', setVh);
        window.removeEventListener('orientationchange', setVh);
      };
    }

    // ✅ Android Chrome specific fixes
    if (isAndroid && isChrome) {
      // Prevent pull-to-refresh interference
      document.body.style.overscrollBehavior = 'contain';
    }

  }, []);

  return null;
}