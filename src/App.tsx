import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline } from '@mui/material';
import { ThemeContextProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { CalendarPage } from './pages/calendar/CalendarPage';
import { PetsPage } from './pages/pets/PetsPage';
import { PetDetailPage } from './pages/health/PetDetailPage';
import { VetsPage } from './pages/vets/VetsPage';

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
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/" element={<ProtectedRoute><Layout><CalendarPage /></Layout></ProtectedRoute>} />
                <Route path="/pets" element={<ProtectedRoute><Layout><PetsPage /></Layout></ProtectedRoute>} />
                <Route path="/vets" element={<ProtectedRoute><Layout><VetsPage /></Layout></ProtectedRoute>} />
                <Route path="/pets/:petId" element={<ProtectedRoute><Layout><PetDetailPage /></Layout></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </NotificationProvider>
      </ThemeContextProvider>
    </QueryClientProvider>
  );
}
