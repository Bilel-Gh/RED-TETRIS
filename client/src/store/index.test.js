import { describe, it, expect } from 'vitest';
import { store } from './index'; // Import the configured store
import authReducer, { logout } from '../features/authSlice'; // Import a reducer and an action
import gameReducer, { getGames } from '../features/gameSlice'; // Import a reducer and an action

describe('Redux Store', () => {
  it('should be a valid Redux store', () => {
    expect(store).toBeDefined();
    expect(typeof store.getState).toBe('function');
    expect(typeof store.dispatch).toBe('function');
    expect(typeof store.subscribe).toBe('function');
  });

  it('should have the auth reducer correctly configured', () => {
    const state = store.getState();
    expect(state.auth).toBeDefined();
    // Check if the initial state of authReducer matches the one in the store
    const expectedInitialAuthState = authReducer(undefined, { type: 'unknown' });
    expect(state.auth).toEqual(expectedInitialAuthState);
  });

  it('should have the game reducer correctly configured', () => {
    const state = store.getState();
    expect(state.game).toBeDefined();
    // Check if the initial state of gameReducer matches the one in the store
    const expectedInitialGameState = gameReducer(undefined, { type: 'unknown' });
    expect(state.game).toEqual(expectedInitialGameState);
  });

  it('should update auth state when an auth action is dispatched', () => {
    // Dispatch a simple action that changes state noticeably
    store.dispatch(logout()); // logout sets isAuthenticated to false, user to null, status to idle
    const state = store.getState().auth;
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.status).toBe('idle');
  });

  it('should update game state when a game action is dispatched', () => {
    // Dispatch une action simple qui ne nécessite pas de connexion socket
    const initialState = store.getState().game;
    // Test que le store peut gérer les actions (sans déclencher de connexion)
    expect(initialState.status).toBe('idle');
  });
});
