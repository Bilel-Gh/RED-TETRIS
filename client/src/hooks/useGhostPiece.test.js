import { renderHook, act } from '@testing-library/react';
import { useGhostPiece } from './useGhostPiece';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Helper to mock localStorage
const mockLocalStorage = () => {
  let store = {};
  return {
    getItem: vi.fn(key => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
    clear: vi.fn(() => { store = {}; }),
    removeItem: vi.fn(key => delete store[key]),
  };
};

describe('useGhostPiece Hook', () => {
  let localStorageMock;

  beforeEach(() => {
    localStorageMock = mockLocalStorage();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete window.localStorage;
  });

  describe('ghostPieceEnabled state and toggleGhostPiece', () => {
    it('initializes ghostPieceEnabled to true by default if localStorage is empty', () => {
      const { result } = renderHook(() => useGhostPiece());
      expect(result.current.ghostPieceEnabled).toBe(true);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('redTetrisGhostPiece');
    });

    it('initializes ghostPieceEnabled from localStorage if present (false)', () => {
      localStorageMock.getItem.mockReturnValue('false');
      const { result } = renderHook(() => useGhostPiece());
      expect(result.current.ghostPieceEnabled).toBe(false);
    });

    it('initializes ghostPieceEnabled from localStorage if present (true)', () => {
      localStorageMock.getItem.mockReturnValue('true');
      const { result } = renderHook(() => useGhostPiece());
      expect(result.current.ghostPieceEnabled).toBe(true);
    });

    it('toggleGhostPiece flips the state and saves to localStorage', () => {
      const { result } = renderHook(() => useGhostPiece()); // Starts true
      act(() => {
        result.current.toggleGhostPiece();
      });
      expect(result.current.ghostPieceEnabled).toBe(false);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('redTetrisGhostPiece', 'false');

      act(() => {
        result.current.toggleGhostPiece();
      });
      expect(result.current.ghostPieceEnabled).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('redTetrisGhostPiece', 'true');
    });
  });

  describe('calculateGhostPosition', () => {
    const emptyGrid = Array(10).fill(null).map(() => Array(5).fill(0)); // 10 rows, 5 cols
    const pieceI = { x: 1, y: 0, shape: [[1, 1, 1, 1]] }; // Horizontal I

    it('returns null if ghostPieceEnabled is false', () => {
      localStorageMock.getItem.mockReturnValue('false'); // Disable ghost
      const { result } = renderHook(() => useGhostPiece());
      const position = result.current.calculateGhostPosition(emptyGrid, pieceI);
      expect(position).toBeNull();
    });

    it('returns null if currentPiece is null', () => {
      const { result } = renderHook(() => useGhostPiece());
      const position = result.current.calculateGhostPosition(emptyGrid, null);
      expect(position).toBeNull();
    });

    it('returns null if grid is null', () => {
      const { result } = renderHook(() => useGhostPiece());
      const position = result.current.calculateGhostPosition(null, pieceI);
      expect(position).toBeNull();
    });

    it('calculates correct ghost position for a piece that can drop multiple rows', () => {
      const { result } = renderHook(() => useGhostPiece());
      const testGrid = [...emptyGrid.map(row => [...row])];
      const testPiece = { x: 0, y: 0, shape: [[1]] }; // Single block

      const ghost = result.current.calculateGhostPosition(testGrid, testPiece);
      expect(ghost).not.toBeNull();
      expect(ghost?.y).toBe(9); // Should drop to the bottom row (index 9)
      expect(ghost?.x).toBe(0);
    });

    it('calculates correct ghost position when piece is blocked by another piece', () => {
      const { result } = renderHook(() => useGhostPiece());
      const testGrid = [...emptyGrid.map(row => [...row])];
      testGrid[5][0] = 'X'; // Block at row 5, col 0
      const testPiece = { x: 0, y: 0, shape: [[1]] }; // Single block

      const ghost = result.current.calculateGhostPosition(testGrid, testPiece);
      expect(ghost).not.toBeNull();
      expect(ghost?.y).toBe(4); // Should stop at row 4, above the block
    });

    it('returns null if the piece is already at the lowest possible position and cannot move further', () => {
      const { result } = renderHook(() => useGhostPiece());
      const testGrid = [...emptyGrid.map(row => [...row])];
      const testPiece = { x: 0, y: 9, shape: [[1]] }; // Single block already at bottom

      // The ghost piece's y would be currentPiece.y, so calculateGhostPosition returns null
      const ghost = result.current.calculateGhostPosition(testGrid, testPiece);
      expect(ghost).toBeNull();
    });

    it('returns null if piece cannot move down at all (blocked immediately)', () => {
      const { result } = renderHook(() => useGhostPiece());
      const testGrid = [...emptyGrid.map(row => [...row])];
      testGrid[1][0] = 'X'; // Block at row 1, col 0
      const testPiece = { x: 0, y: 0, shape: [[1]] }; // Single block at row 0

      const ghost = result.current.calculateGhostPosition(testGrid, testPiece);
      // Ghost y would be 0 (same as currentPiece.y), so it should return null
      expect(ghost).toBeNull();
    });

    it('handles complex shapes correctly (e.g., T-piece)', () => {
      const { result } = renderHook(() => useGhostPiece());
      const tGrid = Array(10).fill(null).map(() => Array(5).fill(0));
      // T-piece:  010
      //           111
      const tPiece = { x: 1, y: 0, shape: [[0, 1, 0], [1, 1, 1]] };

      // Block path for the T-piece
      tGrid[5][1] = 'X'; // Blocks the middle prong of T if it drops

      const ghost = result.current.calculateGhostPosition(tGrid, tPiece);
      expect(ghost).not.toBeNull();
      // The T piece is 2 units high. y=0 means rows 0 and 1.
      // If it drops to y=3, its bottom row is row 4 (0,1,2,3,4). Block is at row 5.
      // So ghost.y should be 3.
      expect(ghost?.y).toBe(3);
    });

    it('ghost piece has the same shape and x as current piece', () => {
        const { result } = renderHook(() => useGhostPiece());
        const testGrid = [...emptyGrid.map(row => [...row])];
        const testPiece = { x: 2, y: 1, shape: [[1,1],[1,1]] }; // 2x2 Square

        const ghost = result.current.calculateGhostPosition(testGrid, testPiece);
        expect(ghost).not.toBeNull();
        expect(ghost?.shape).toEqual(testPiece.shape);
        expect(ghost?.x).toEqual(testPiece.x);
      });

  });
});
