import { useEffect } from 'react';
import { reportError, reportUnhandledPromiseRejection } from '../services/errorReporter';
import { Platform } from 'react-native';

export function useGlobalErrorListener() {
  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    const handleError = (event) => {
      const error = event.error || new Error(event.message);
      const message = error?.message || event.message || 'Unknown error';
      const stack = error?.stack || '';

      reportError({
        type: 'js_crash',
        severity: 'high',
        message: `Unhandled JavaScript Error: ${message}`,
        screen: window.location.pathname,
        details: stack,
        source: 'global_error_listener'
      }).catch(err => {
        console.error('[GlobalErrorListener] Failed to report:', err);
      });
    };

    const handleUnhandledRejection = (event) => {
      const reason = event.reason;
      reportUnhandledPromiseRejection(reason).catch(err => {
        console.error('[GlobalErrorListener] Failed to report rejection:', err);
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
}
