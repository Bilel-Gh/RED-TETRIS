import { useSelector, useDispatch } from 'react-redux';
import { loginStart, logout } from '../features/authSlice';
import socketService from '../services/socketService';

export function useAuth() {
  const dispatch = useDispatch();
  const { user, isAuthenticated, status, error } = useSelector((state) => state.auth);

  const login = async (username) => {
    if (!username || username.trim() === '') {
      return Promise.reject('Le nom d\'utilisateur ne peut pas être vide');
    }

     // Éviter les dispatches multiples si déjà en chargement
     if (status !== 'loading') {
      dispatch(loginStart());
      console.log('login start dans login');
    }
    try {
      await socketService.login(username);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    socketService.disconnect();
  };

  return {
    user,
    isAuthenticated,
    status,
    error,
    login,
    logout: handleLogout
  };
}
