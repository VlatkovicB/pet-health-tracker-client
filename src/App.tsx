import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline } from '@mui/material';
import { ThemeContextProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AdminRoute } from './routes/AdminRoute';
import { Layout } from './components/Layout';
import { AdminPage } from './pages/admin/AdminPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { CalendarPage } from './pages/calendar/CalendarPage';
import { PetsPage } from './pages/pets/PetsPage';
import { PetDetailPage } from './pages/health/PetDetailPage';
import { VetsPage } from './pages/vets/VetsPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { PhotosPage } from './pages/photos/PhotosPage';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeContextProvider>
        <CssBaseline />
        <NotificationProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login"    element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
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
        </NotificationProvider>
      </ThemeContextProvider>
    </QueryClientProvider>
  );
}
