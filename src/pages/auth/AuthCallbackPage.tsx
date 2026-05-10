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
    console.log('[AuthCallback] hash:', window.location.hash.slice(0, 30));
    console.log('[AuthCallback] token found:', !!token, 'length:', token?.length);

    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      console.log('[AuthCallback] token stored, calling login()');
      window.history.replaceState(null, '', window.location.pathname);
      login()
        .then(() => { console.log('[AuthCallback] login() ok, navigating'); navigate('/', { replace: true }); })
        .catch((err) => {
          console.error('[AuthCallback] login() failed:', err?.response?.status, err?.message);
          localStorage.removeItem(TOKEN_KEY);
          navigate('/auth?error=server_error', { replace: true });
        });
    } else {
      console.warn('[AuthCallback] no token in hash');
      navigate('/auth?error=oauth_failed', { replace: true });
    }
  }, [login, navigate]);

  return null;
}
