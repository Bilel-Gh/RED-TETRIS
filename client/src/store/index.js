import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/authSlice';
import gameReducer from '../features/gameSlice';
import socketMiddleware from './socketMiddleware';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    game: gameReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignorer certaines actions non-sérialisables liées à Socket.io
        ignoredActions: ['socket/connect', 'socket/disconnect'],
      },
    }).concat(socketMiddleware),
});
