import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TOKEN_KEY } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      login()
        .then(() => navigate('/', { replace: true }))
        .catch((err) => {
          console.error('[AuthCallback] login() failed:', err?.response?.status, err?.message);
          localStorage.removeItem(TOKEN_KEY);
          navigate('/auth?error=server_error', { replace: true });
        });
    } else {
      console.warn('[AuthCallback] no token in query');
      navigate('/auth?error=oauth_failed', { replace: true });
    }
  }, [searchParams, login, navigate]);

  return null;
}
