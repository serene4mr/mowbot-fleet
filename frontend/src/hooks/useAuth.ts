import { apiClient } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import type { LoginRequest } from '../types/auth';

export function useAuth() {
  const { token, user, setAuth, logout } = useAuthStore();

  const login = async (credentials: LoginRequest): Promise<void> => {
    const tokenRes = await apiClient.post('/api/auth/login', credentials);
    const { access_token } = tokenRes.data;

    const meRes = await apiClient.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    setAuth(access_token, meRes.data);
  };

  return { token, user, login, logout };
}
