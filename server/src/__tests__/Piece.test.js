import { describe, it, expect } from 'vitest';
import { Piece } from '../models/Piece.js';

describe('Piece', () => {
  // Test de la création d'une pièce
  describe('constructor', () => {
    it('devrait créer une pièce avec les paramètres par défaut', () => {
      const piece = new Piece('I');
      expect(piece.type).toBe('I');
      expect(piece.x).toBe(0);
      expect(piece.y).toBe(0);
      expect(piece.rotation).toBe(0);
      expect(piece.color).toBe('cyan');
      expect(piece.shape).toEqual(Piece.SHAPES.I);
    });

    it('devrait créer une pièce avec une position spécifiée', () => {
      const piece = new Piece('T', 3, 2);
      expect(piece.type).toBe('T');
      expect(piece.x).toBe(3);
      expect(piece.y).toBe(2);
      expect(piece.rotation).toBe(0);
      expect(piece.color).toBe('purple');
      expect(piece.shape).toEqual(Piece.SHAPES.T);
    });

    it('devrait lever une erreur pour un type de pièce invalide', () => {
      expect(() => new Piece('X')).toThrow('Type de pièce invalide: X');
    });
  });

  // Test de la méthode clone()
  describe('clone', () => {
    it('devrait créer une copie exacte de la pièce', () => {
      const original = new Piece('J', 5, 10);
      original.rotation = 2;

      const clone = original.clone();

      expect(clone).not.toBe(original); // Instance différente
      expect(clone.type).toBe(original.type);
      expect(clone.x).toBe(original.x);
      expect(clone.y).toBe(original.y);
      expect(clone.rotation).toBe(original.rotation);
      expect(clone.color).toBe(original.color);

      // Le changement de la forme originale ne devrait pas affecter le clone
      const originalShape = JSON.stringify(original.shape);
      const cloneShape = JSON.stringify(clone.shape);
      expect(cloneShape).toBe(originalShape);

      original.shape[0][0] = 9;
      expect(JSON.stringify(clone.shape)).toBe(cloneShape);
    });
  });

  // Test de la méthode rotate()
  describe('rotate', () => {
    it('ne devrait pas faire tourner une pièce O', () => {
      const piece = new Piece('O');
      const originalShape = JSON.stringify(piece.shape);

      piece.rotate();

      expect(JSON.stringify(piece.shape)).toBe(originalShape);
      expect(piece.rotation).toBe(0);
    });

    it('devrait faire tourner une pièce I', () => {
      const piece = new Piece('I');
      const originalRotation = piece.rotation;

      piece.rotate();

      expect(piece.rotation).toBe((originalRotation + 1) % 4);
    });

    it('devrait faire tourner une pièce T complètement (4 rotations = retour à la position initiale)', () => {
      const piece = new Piece('T');
      const originalShape = JSON.stringify(piece.shape);

      // 4 rotations
      for (let i = 0; i < 4; i++) {
        piece.rotate();
      }

      expect(piece.rotation).toBe(0);
      expect(JSON.stringify(piece.shape)).toBe(originalShape);
    });

    it('devrait retourner la pièce elle-même pour permettre le chaînage', () => {
      const piece = new Piece('L');
      const result = piece.rotate();

      expect(result).toBe(piece);
    });
  });

  // Test de la méthode getMatrix()
  describe('getMatrix', () => {
    it('devrait retourner la matrice de la forme actuelle', () => {
      const piece = new Piece('S');

      const matrix = piece.getMatrix();

      expect(matrix).toBe(piece.shape);
    });
  });
});
