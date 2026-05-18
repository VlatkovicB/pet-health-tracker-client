import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import axios from 'axios';
import { toastRef } from './context/toastRef';
import { getApiError } from './api/client';
import { CssBaseline } from '@mui/material';
import { ThemeContextProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AdminRoute } from './routes/AdminRoute';
import { Layout } from './components/Layout';
import { AdminPage } from './pages/admin/AdminPage';
import { AuthPage } from './pages/auth/AuthPage';
import { AuthCallbackPage } from './pages/auth/AuthCallbackPage';
import { CalendarPage } from './pages/calendar/CalendarPage';
import { PetsPage } from './pages/pets/PetsPage';
import { PetDetailPage } from './pages/health/PetDetailPage';
import { VetsPage } from './pages/vets/VetsPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { PhotosPage } from './pages/photos/PhotosPage';

function isUnauthorized(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (isUnauthorized(error)) return;
      toastRef.current?.showError(getApiError(error));
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      if (isUnauthorized(error)) return;
      toastRef.current?.showError(getApiError(error));
    },
  }),
});

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeContextProvider>
        <CssBaseline />
        <NotificationProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/auth"          element={<AuthPage />} />
                  <Route path="/auth/callback" element={<AuthCallbackPage />} />
                  <Route path="/login"    element={<Navigate to="/auth" replace />} />
                  <Route path="/register" element={<Navigate to="/auth" replace />} />
                  <Route path="/"         element={<ProtectedRoute><Layout><CalendarPage /></Layout></ProtectedRoute>} />
                  <Route path="/pets"     element={<ProtectedRoute><Layout><PetsPage /></Layout></ProtectedRoute>} />
                  <Route path="/vets"     element={<ProtectedRoute><Layout><VetsPage /></Layout></ProtectedRoute>} />
                  <Route path="/pets/:petId" element={<ProtectedRoute><Layout><PetDetailPage /></Layout></ProtectedRoute>} />
                  <Route path="/profile"  element={<ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>} />
                  <Route path="/photos"   element={<ProtectedRoute><Layout><PhotosPage /></Layout></ProtectedRoute>} />
                  <Route path="/admin"     element={<AdminRoute><Layout><AdminPage /></Layout></AdminRoute>} />
                  <Route path="*"         element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
            </AuthProvider>
          </QueryClientProvider>
        </NotificationProvider>
      </ThemeContextProvider>
    </ErrorBoundary>
  );
}
