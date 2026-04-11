import { createContext, useCallback, useContext, useState } from 'react';
import { Snackbar, Alert } from '@mui/material';

interface NotificationState {
  open: boolean;
  message: string;
  severity: 'error' | 'success';
}

interface NotificationContextValue {
  showError: (msg: string) => void;
  showSuccess: (msg: string) => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  showError: () => {},
  showSuccess: () => {},
});

export function useNotification() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<NotificationState>({ open: false, message: '', severity: 'error' });

  const showError = useCallback((msg: string) => setState({ open: true, message: msg, severity: 'error' }), []);
  const showSuccess = useCallback((msg: string) => setState({ open: true, message: msg, severity: 'success' }), []);
  const handleClose = () => setState((s) => ({ ...s, open: false }));

  return (
    <NotificationContext.Provider value={{ showError, showSuccess }}>
      {children}
      <Snackbar
        open={state.open}
        autoHideDuration={5000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={state.severity} onClose={handleClose} variant="filled" sx={{ minWidth: 280 }}>
          {state.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
}
