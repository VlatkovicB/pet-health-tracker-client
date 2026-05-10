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
    console.log('[AuthCallback] token found:', !!token, 'length:', token?.length);

    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      console.log('[AuthCallback] token stored, calling login()');
      login()
        .then(() => { console.log('[AuthCallback] login() ok'); navigate('/', { replace: true }); })
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

  return (
    <div style={{ padding: 40, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
      Completing login...
      <br />
      token in URL: {searchParams.get('token') ? 'YES (' + searchParams.get('token')!.slice(0, 20) + '...)' : 'NO'}
      <br />
      pathname: {window.location.pathname}
      <br />
      search: {window.location.search.slice(0, 60)}
    </div>
  );
}
