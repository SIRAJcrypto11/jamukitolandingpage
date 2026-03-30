import { useEffect } from 'react';

export default function CorsDebugger() {
  useEffect(() => {
    // ✅ Detect CORS issues and provide helpful feedback
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        return response;
      } catch (error) {
        // ✅ Detect common CORS/network issues
        if (error.message?.includes('CORS') || error.message?.includes('cross-origin')) {
          console.error('🚫 CORS Error detected:', error);
          console.log('💡 Possible solutions:');
          console.log('   1. Check if domain is properly configured');
          console.log('   2. Ensure cookies are enabled');
          console.log('   3. Try clearing browser cache');
        }
        
        if (error.message?.includes('Failed to fetch')) {
          console.error('🌐 Network Error:', error);
          console.log('💡 User might be offline or server unreachable');
        }
        
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}