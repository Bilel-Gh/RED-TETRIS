import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import TetrisGrid from '../TetrisGrid';

const mockStore = configureStore([]);

describe('TetrisGrid Component', () => {
  let store;

  beforeEach(() => {
    store = mockStore({
      game: {
        gameState: {
          isActive: true,
          playerStates: {
            'user1': {
              gameOver: false
            }
          }
        }
      },
      auth: {
        user: {
          id: 'user1'
        }
      }
    });
  });

  it('renders empty grid correctly', () => {
    const defaultGrid = Array(20).fill().map(() => Array(10).fill('0'));
    render(
      <Provider store={store}>
        <TetrisGrid grid={defaultGrid} />
      </Provider>
    );

    const gridCells = document.querySelectorAll('.grid-cell');
    expect(gridCells.length).toBe(200); // 20 rows * 10 columns
  });

  it('renders grid with current piece', () => {
    const grid = Array(20).fill().map(() => Array(10).fill('0'));
    const currentPiece = {
      type: 'I',
      shape: [[1, 1, 1, 1]],
      x: 3,
      y: 0
    };

    render(
      <Provider store={store}>
        <TetrisGrid grid={grid} currentPiece={currentPiece} />
      </Provider>
    );

    const activeCells = document.querySelectorAll('.active-cell');
    expect(activeCells.length).toBe(4); // I piece has 4 cells
  });

  it('shows game over overlay when player is game over', () => {
    store = mockStore({
      game: {
        gameState: {
          isActive: true,
          playerStates: {
            'user1': {
              gameOver: true
            }
          }
        }
      },
      auth: {
        user: {
          id: 'user1'
        }
      }
    });

    render(
      <Provider store={store}>
        <TetrisGrid grid={Array(20).fill().map(() => Array(10).fill('0'))} />
      </Provider>
    );

    expect(screen.getByText('GAME OVER')).toBeInTheDocument();
  });

  it('applies penalty shake effect when penalty is received', () => {
    store = mockStore({
      game: {
        gameState: {
          isActive: true,
          playerStates: {
            'user1': {
              gameOver: false
            }
          },
          lastPenalty: {
            timestamp: Date.now(),
            fromPlayer: 'user2'
          }
        }
      },
      auth: {
        user: {
          id: 'user1'
        }
      }
    });

    render(
      <Provider store={store}>
        <TetrisGrid grid={Array(20).fill().map(() => Array(10).fill('0'))} />
      </Provider>
    );

    const gridContainer = document.querySelector('.tetris-grid-container');
    expect(gridContainer).toHaveClass('penalty-shake');
  });
});
