import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TOKEN_KEY } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const token = params.get('token');

    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      window.history.replaceState(null, '', window.location.pathname);
      login().then(() => navigate('/', { replace: true }));
    } else {
      navigate('/', { replace: true });
    }
  }, [login, navigate]);

  return null;
}
