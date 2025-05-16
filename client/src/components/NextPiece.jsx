import React from 'react';
import './Tetris.css';

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

const NextPiece = ({ type }) => {
  console.log('NextPiece - type reçu:', type);

  // Gestion du cas où type est un objet complet au lieu d'une simple chaîne
  let pieceType = type;
  if (type && typeof type === 'object' && type.type) {
    pieceType = type.type;
  }

  // Vérifier si le type est une chaîne valide
  if (!pieceType || typeof pieceType !== 'string' || !SHAPES[pieceType]) {
    console.log('Type de pièce invalide ou non défini:', pieceType);
    return (
      <div className="next-piece-container">
        <h3>Prochaine pièce</h3>
        <div className="next-piece-wrapper">
          <div className="next-piece-empty">
            Chargement...
          </div>
        </div>
      </div>
    );
  }

  const shape = SHAPES[pieceType];
  const color = COLORS[pieceType];

  console.log('NextPiece - affichage de la pièce:', pieceType);

  return (
    <div className="next-piece-container">
      <h3>Prochaine pièce</h3>
      <div className="next-piece-wrapper">
        <div>
          {shape.map((row, rowIndex) => (
            <div key={`row-${rowIndex}`} className="next-piece-row">
              {row.map((cell, colIndex) => (
                <div
                  key={`cell-${rowIndex}-${colIndex}`}
                  className={`next-piece-cell ${cell ? color : 'next-cell-empty'}`}
                  data-type={pieceType}
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
