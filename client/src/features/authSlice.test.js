import { describe, it, expect } from 'vitest';
import authReducer, { loginStart, loginSuccess, loginFailure, logout } from './authSlice';

const initialState = {
  user: null,
  isAuthenticated: false,
  status: 'idle',
  error: null,
};

describe('authSlice', () => {
  describe('reducer', () => {
    it('should return the initial state', () => {
      expect(authReducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    it('should handle loginStart', () => {
      const previousState = { ...initialState, error: 'Previous error' };
      const expectedState = {
        ...initialState,
        status: 'loading',
        error: null, // Error should be cleared
      };
      expect(authReducer(previousState, loginStart())).toEqual(expectedState);
    });

    it('should handle loginSuccess', () => {
      const user = { id: '1', username: 'testuser' };
      const previousState = { ...initialState, status: 'loading' };
      const expectedState = {
        ...initialState,
        status: 'succeeded',
        isAuthenticated: true,
        user: user,
        error: null,
      };
      expect(authReducer(previousState, loginSuccess(user))).toEqual(expectedState);
    });

    it('should handle loginFailure', () => {
      const error = 'Login failed';
      const previousState = { ...initialState, status: 'loading' };
      const expectedState = {
        ...initialState,
        status: 'failed',
        error: error,
      };
      expect(authReducer(previousState, loginFailure(error))).toEqual(expectedState);
    });

    it('should handle logout', () => {
      const previousState = {
        user: { id: '1', username: 'testuser' },
        isAuthenticated: true,
        status: 'succeeded',
        error: null,
      };
      // Expected state is the initial state
      expect(authReducer(previousState, logout())).toEqual(initialState);
    });

    it('logout should clear error and set status to idle even if there was an error', () => {
      const previousState = {
        user: { id: '1', username: 'testuser' },
        isAuthenticated: true,
        status: 'failed', // Status was 'failed'
        error: 'Some previous error', // Error was set
      };
      // Expected state is the initial state
      expect(authReducer(previousState, logout())).toEqual(initialState);
    });
  });

  describe('actions', () => {
    it('loginStart should create the correct action', () => {
      expect(loginStart()).toEqual({ type: 'auth/loginStart', payload: undefined });
    });

    it('loginSuccess should create the correct action', () => {
      const user = { id: '1', username: 'testuser' };
      expect(loginSuccess(user)).toEqual({ type: 'auth/loginSuccess', payload: user });
    });

    it('loginFailure should create the correct action', () => {
      const error = 'Login failed';
      expect(loginFailure(error)).toEqual({ type: 'auth/loginFailure', payload: error });
    });

    it('logout should create the correct action', () => {
      expect(logout()).toEqual({ type: 'auth/logout', payload: undefined });
    });
  });
});
