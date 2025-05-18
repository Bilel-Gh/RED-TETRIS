/**
 * Configuration du jeu Tetris
 */

// Dimensions de la grille de jeu
export const GRID_WIDTH = 10;
export const GRID_HEIGHT = 20;

// Niveaux et vitesse
export const INITIAL_FALL_SPEED = 1000; // ms
export const SPEED_INCREASE_PER_LEVEL = 50; // ms
export const MIN_FALL_SPEED = 100; // ms

// Points par lignes
export const POINTS = {
  1: 40,    // 1 ligne
  2: 100,   // 2 lignes
  3: 300,   // 3 lignes
  4: 1200   // 4 lignes (Tetris)
};

// Pénalités
export const PENALTY_THRESHOLD = 2; // Nombre min de lignes pour appliquer des pénalités
