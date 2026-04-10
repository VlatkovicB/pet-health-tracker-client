import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { theme } from './theme';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { GroupsPage } from './pages/groups/GroupsPage';
import { PetsPage } from './pages/pets/PetsPage';
import { PetDetailPage } from './pages/health/PetDetailPage';
import { VetsPage } from './pages/vets/VetsPage';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/" element={<ProtectedRoute><Layout><GroupsPage /></Layout></ProtectedRoute>} />
              <Route path="/groups/:groupId" element={<ProtectedRoute><Layout><PetsPage /></Layout></ProtectedRoute>} />
              <Route path="/groups/:groupId/vets" element={<ProtectedRoute><Layout><VetsPage /></Layout></ProtectedRoute>} />
              <Route path="/groups/:groupId/pets/:petId" element={<ProtectedRoute><Layout><PetDetailPage /></Layout></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
