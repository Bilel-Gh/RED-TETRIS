import React from 'react';

// Couleurs des pièces Tetris (sans Tailwind)
const COLORS = {
  'I': 'next-cell-i',
  'O': 'next-cell-o',
  'T': 'next-cell-t',
  'S': 'next-cell-s',
  'Z': 'next-cell-z',
  'J': 'next-cell-j',
  'L': 'next-cell-l',
  '0': 'next-cell-empty',
};

// Formes des pièces Tetris
const SHAPES = {
  'I': [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ],
  'O': [
    [1, 1],
    [1, 1]
  ],
  'T': [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  'S': [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0]
  ],
  'Z': [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0]
  ],
  'J': [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  'L': [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0]
  ]
};

const NextPiece = ({ pieceType }) => {
  if (!pieceType || !SHAPES[pieceType]) {
    return null;
  }

  const shape = SHAPES[pieceType];
  const color = COLORS[pieceType];

  return (
    <div className="next-piece-container">
      <div className="next-piece-wrapper">
        <div>
          {shape.map((row, rowIndex) => (
            <div key={`row-${rowIndex}`} className="next-piece-row">
              {row.map((cell, colIndex) => (
                <div
                  key={`cell-${rowIndex}-${colIndex}`}
                  className={`next-piece-cell ${cell ? color : 'next-cell-empty'}`}
                  data-row={rowIndex}
                  data-col={colIndex}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NextPiece;
