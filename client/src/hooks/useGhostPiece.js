import { useState, useEffect, useCallback } from 'react';

export const useGhostPiece = () => {
  // État pour savoir si la fonctionnalité de ghost piece est activée
  const [ghostPieceEnabled, setGhostPieceEnabled] = useState(() => {
    const savedPreference = localStorage.getItem('redTetrisGhostPiece');
    return savedPreference !== null ? JSON.parse(savedPreference) : true; // Activé par défaut
  });

  // Sauvegarde de la préférence dans localStorage
  useEffect(() => {
    localStorage.setItem('redTetrisGhostPiece', JSON.stringify(ghostPieceEnabled));
  }, [ghostPieceEnabled]);

  // Permet de basculer l'état de la fonctionnalité
  const toggleGhostPiece = useCallback(() => {
    setGhostPieceEnabled(prev => !prev);
  }, []);

  // Calcule la position de la ghost piece
  const calculateGhostPosition = useCallback((grid, currentPiece) => {
    if (!ghostPieceEnabled || !currentPiece || !grid) {
      return null;
    }

    // Copie de la pièce courante
    const ghostPiece = { ...currentPiece };

    // Fonction pour vérifier si une position est valide
    const isValidPosition = (piece, grid) => {
      if (!piece || !piece.shape || !grid) return false;

      for (let row = 0; row < piece.shape.length; row++) {
        for (let col = 0; col < piece.shape[row].length; col++) {
          if (piece.shape[row][col] !== 0) {
            const gridRow = piece.y + row;
            const gridCol = piece.x + col;

            // Si une partie de la pièce est hors de la grille ou sur une cellule occupée
            if (
              gridRow < 0 ||
              gridRow >= grid.length ||
              gridCol < 0 ||
              gridCol >= grid[0].length ||
              (grid[gridRow][gridCol] !== '0' && grid[gridRow][gridCol] !== 0)
            ) {
              return false;
            }
          }
        }
      }
      return true;
    };

    // Descendre la pièce fantôme jusqu'à ce qu'elle atteigne le sol ou une autre pièce
    while (isValidPosition(ghostPiece, grid)) {
      ghostPiece.y += 1;
    }

    // Remonter d'une unité car la dernière position était invalide
    ghostPiece.y -= 1;

    // Ne retourner la ghost piece que si elle est à une position différente de la pièce actuelle
    return ghostPiece.y > currentPiece.y ? ghostPiece : null;
  }, [ghostPieceEnabled]);

  return {
    ghostPieceEnabled,
    toggleGhostPiece,
    calculateGhostPosition
  };
};
