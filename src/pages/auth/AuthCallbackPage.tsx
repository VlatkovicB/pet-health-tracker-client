import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TOKEN_KEY } from '../../api/client';

export function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const token = params.get('token');

    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      window.history.replaceState(null, '', window.location.pathname);
    }

    navigate('/', { replace: true });
  }, [navigate]);

  return null;
}
