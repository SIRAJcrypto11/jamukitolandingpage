import React from 'react';
import { Button } from '@/components/ui/button';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearCache = () => {
    try {
      sessionStorage.clear();
      localStorage.clear();
      window.location.href = '/';
    } catch (e) {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Oops! Terjadi Kesalahan
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Aplikasi mengalami gangguan. Silakan refresh atau clear cache.
            </p>
            
            <div className="space-y-3">
              <Button 
                onClick={this.handleReload}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                🔄 Refresh Halaman
              </Button>
              
              <Button 
                onClick={this.handleClearCache}
                variant="outline"
                className="w-full"
              >
                🗑️ Clear Cache & Reload
              </Button>
            </div>

            {this.state.error && (
              <details className="mt-4 text-left text-xs text-gray-500 dark:text-gray-400">
                <summary className="cursor-pointer">Technical Details</summary>
                <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;