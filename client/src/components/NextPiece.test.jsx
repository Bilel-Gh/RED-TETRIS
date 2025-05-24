import React from 'react';
import { render, screen } from '@testing-library/react';
import NextPiece from './NextPiece';

// Formes des pièces Tetris (pour vérification de la structure)
const SHAPES = {
  'I': [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  'O': [[1,1],[1,1]],
  'T': [[0,1,0],[1,1,1],[0,0,0]],
  'S': [[0,1,1],[1,1,0],[0,0,0]],
  'Z': [[1,1,0],[0,1,1],[0,0,0]],
  'J': [[1,0,0],[1,1,1],[0,0,0]],
  'L': [[0,0,1],[1,1,1],[0,0,0]]
};

// Couleurs CSS attendues
const COLORS_CSS = {
  'I': 'next-cell-i',
  'O': 'next-cell-o',
  'T': 'next-cell-t',
  'S': 'next-cell-s',
  'Z': 'next-cell-z',
  'J': 'next-cell-j',
  'L': 'next-cell-l',
};

describe('NextPiece Component', () => {
  it('should render "Chargement..." if type is not provided', () => {
    render(<NextPiece />);
    expect(screen.getByText('Prochaine pièce')).toBeInTheDocument();
    expect(screen.getByText('Chargement...')).toBeInTheDocument();
  });

  it('should render "Chargement..." if type is invalid', () => {
    render(<NextPiece type="X" />); // Invalid type
    expect(screen.getByText('Chargement...')).toBeInTheDocument();
  });

  it('should render "Chargement..." if type is an object with an invalid pieceType', () => {
    render(<NextPiece type={{ type: 'X' }} />);
    expect(screen.getByText('Chargement...')).toBeInTheDocument();
  });

  it('should render "Chargement..." if type is an object without a pieceType', () => {
    render(<NextPiece type={{ someOtherProp: 'value' }} />);
    expect(screen.getByText('Chargement...')).toBeInTheDocument();
  });

  // Test pour chaque type de pièce valide
  Object.keys(SHAPES).forEach((pieceType) => {
    it(`should render piece ${pieceType} correctly as string prop`, () => {
      const { container } = render(<NextPiece type={pieceType} />);
      expect(screen.getByText('Prochaine pièce')).toBeInTheDocument();

      const expectedShape = SHAPES[pieceType];
      const expectedColorClass = COLORS_CSS[pieceType];
      const rows = container.querySelectorAll('.next-piece-row');
      expect(rows.length).toBe(expectedShape.length);

      rows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll('.next-piece-cell');
        expect(cells.length).toBe(expectedShape[rowIndex].length);
        cells.forEach((cell, colIndex) => {
          if (expectedShape[rowIndex][colIndex] === 1) {
            expect(cell).toHaveClass(expectedColorClass);
          } else {
            expect(cell).toHaveClass('next-cell-empty');
          }
          expect(cell).toHaveAttribute('data-type', pieceType);
        });
      });
    });

    it(`should render piece ${pieceType} correctly as object prop`, () => {
      const { container } = render(<NextPiece type={{ type: pieceType }} />);
      expect(screen.getByText('Prochaine pièce')).toBeInTheDocument();

      const expectedShape = SHAPES[pieceType];
      const expectedColorClass = COLORS_CSS[pieceType];
      const rows = container.querySelectorAll('.next-piece-row');
      expect(rows.length).toBe(expectedShape.length);

      rows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll('.next-piece-cell');
        expect(cells.length).toBe(expectedShape[rowIndex].length);
        cells.forEach((cell, colIndex) => {
          if (expectedShape[rowIndex][colIndex] === 1) {
            expect(cell).toHaveClass(expectedColorClass);
          } else {
            expect(cell).toHaveClass('next-cell-empty');
          }
          expect(cell).toHaveAttribute('data-type', pieceType);
        });
      });
    });
  });
});
