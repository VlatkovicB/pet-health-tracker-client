import { useState, useCallback, useEffect } from 'react';
import { Snackbar, Alert } from '@mui/material';
import { toastRef } from './toastRef';

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  const showError = useCallback((msg: string) => {
    setMessage(msg);
  }, []);

  useEffect(() => {
    toastRef.current = { showError };
    return () => {
      toastRef.current = null;
    };
  }, [showError]);

  return (
    <>
      {children}
      <Snackbar
        open={message !== null}
        autoHideDuration={5000}
        onClose={() => setMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert severity="error" onClose={() => setMessage(null)} sx={{ width: '100%' }}>
          {message}
        </Alert>
      </Snackbar>
    </>
  );
}
