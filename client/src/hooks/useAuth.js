import { useSelector, useDispatch } from 'react-redux';
import { loginStart, logout } from '../features/authSlice';
import { socketService } from '../services/socketService';
import { useCallback } from 'react';

export function useAuth() {
  const dispatch = useDispatch();
  const { user, isAuthenticated, status, error } = useSelector((state) => state.auth);

  const login = useCallback(async (username) => {
    if (!username || username.trim() === '') {
      return Promise.reject('Le nom d\'utilisateur ne peut pas être vide');
    }

    // Éviter les dispatches multiples si déjà authentifié avec ce nom d'utilisateur
    if (isAuthenticated && user && user.username === username) {
      return Promise.resolve(user);
    }

    // Éviter les dispatches multiples si déjà en chargement
    if (status !== 'loading') {
      dispatch(loginStart());
    }

    try {
      const userData = await socketService.login(username);
      return userData;
    } catch (error) {
      console.error('Échec de la connexion:', error);
      return Promise.reject(error);
    }
  }, [dispatch, isAuthenticated, status, user]);

  const handleLogout = useCallback(() => {
    // Nettoyer les données d'authentification stockées
    localStorage.removeItem('redTetrisAuth');
    sessionStorage.removeItem('redTetrisAuth');

    // Déconnecter le socket
    socketService.disconnect();

    // Mettre à jour l'état Redux
    dispatch(logout());
  }, [dispatch]);

  return {
    user,
    isAuthenticated,
    status,
    error,
    login,
    logout: handleLogout
  };
}
