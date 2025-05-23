import { describe, it, expect } from 'vitest';
import { Piece } from '../Piece.js';

describe('Piece', () => {
  describe('constructor', () => {
    it('should create a piece with given type, position, shape and color', () => {
      const piece = new Piece('T', 3, 0);
      expect(piece.type).toBe('T');
      expect(piece.x).toBe(3);
      expect(piece.y).toBe(0);
      expect(piece.shape).toEqual(Piece.SHAPES.T);
      expect(piece.color).toBe(Piece.COLORS.T);
      expect(piece.rotation).toBe(0);
    });

    it('should default x and y to 0 if not provided', () => {
      const piece = new Piece('I');
      expect(piece.x).toBe(0);
      expect(piece.y).toBe(0);
    });

    it('should throw an error for invalid piece type', () => {
      expect(() => new Piece('X')).toThrow('Type de pièce invalide: X');
    });
  });

  describe('clone', () => {
    it('should create an identical piece with a different reference', () => {
      const originalPiece = new Piece('L', 2, 1);
      originalPiece.rotate(); // Rotate to change shape and rotation state
      const clonedPiece = originalPiece.clone();

      expect(clonedPiece).not.toBe(originalPiece);
      expect(clonedPiece.type).toBe(originalPiece.type);
      expect(clonedPiece.x).toBe(originalPiece.x);
      expect(clonedPiece.y).toBe(originalPiece.y);
      expect(clonedPiece.shape).toEqual(originalPiece.shape);
      expect(clonedPiece.shape).not.toBe(originalPiece.shape); // Ensure deep clone of shape
      expect(clonedPiece.color).toBe(originalPiece.color);
      expect(clonedPiece.rotation).toBe(originalPiece.rotation);
    });
  });

  describe('rotate', () => {
    it('should not change the shape of piece O', () => {
      const piece = new Piece('O');
      const initialShape = JSON.parse(JSON.stringify(piece.shape));
      piece.rotate();
      expect(piece.shape).toEqual(initialShape);
      expect(piece.rotation).toBe(0); // Rotation state should still be 0 for O piece after "rotation"
    });

    it('should rotate piece I correctly (90 degrees clockwise)', () => {
      const piece = new Piece('I');
      // Initial shape for I:
      // [0,0,0,0]
      // [1,1,1,1]
      // [0,0,0,0]
      // [0,0,0,0]
      piece.rotate();
      // Expected shape after 1 rotation:
      // [0,0,1,0]
      // [0,0,1,0]
      // [0,0,1,0]
      // [0,0,1,0]
      expect(piece.shape).toEqual([
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0]
      ]);
      expect(piece.rotation).toBe(1);
    });

    it('should rotate piece T correctly (90 degrees clockwise)', () => {
      const piece = new Piece('T');
      // Initial T:
      // [0,1,0]
      // [1,1,1]
      // [0,0,0]
      piece.rotate();
      // Expected T after 1 rotation:
      // [0,1,0]
      // [0,1,1]
      // [0,1,0]
      expect(piece.shape).toEqual([
        [0, 1, 0],
        [0, 1, 1],
        [0, 1, 0]
      ]);
      expect(piece.rotation).toBe(1);
    });

    it('should cycle through 4 rotations back to original for non-O pieces', () => {
      const pieceTypes = ['I', 'T', 'S', 'Z', 'J', 'L'];
      pieceTypes.forEach(type => {
        const piece = new Piece(type);
        const initialShape = JSON.parse(JSON.stringify(piece.shape));

        piece.rotate(); // 1
        piece.rotate(); // 2
        piece.rotate(); // 3
        piece.rotate(); // 4 -> 0

        expect(piece.shape).toEqual(initialShape);
        expect(piece.rotation).toBe(0);
      });
    });

    it('should update rotation state correctly after multiple rotations', () => {
        const piece = new Piece('L');
        expect(piece.rotation).toBe(0);
        piece.rotate();
        expect(piece.rotation).toBe(1);
        piece.rotate();
        expect(piece.rotation).toBe(2);
        piece.rotate();
        expect(piece.rotation).toBe(3);
        piece.rotate();
        expect(piece.rotation).toBe(0);
      });
  });

  describe('getMatrix', () => {
    it('should return the current shape of the piece', () => {
      const piece = new Piece('S');
      expect(piece.getMatrix()).toEqual(Piece.SHAPES.S);
      piece.rotate();
      expect(piece.getMatrix()).not.toEqual(Piece.SHAPES.S); // Shape has changed
      expect(piece.getMatrix()).toEqual(piece.shape);
    });
  });
});
