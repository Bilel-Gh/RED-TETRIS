import { useState, useEffect } from 'react';

export const useTheme = () => {
  // Fonction pour détecter la préférence système
  const detectSystemTheme = () => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  };

  // Initialisation du thème depuis localStorage ou préférence système
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('redTetrisTheme');
    return savedTheme || detectSystemTheme();
  });

  // Appliquer le thème quand il change
  useEffect(() => {
    // Sauvegarde dans localStorage
    localStorage.setItem('redTetrisTheme', theme);

    // Appliquer les classes au niveau du document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-theme');
      document.documentElement.classList.remove('light-theme');
    } else {
      document.documentElement.classList.add('light-theme');
      document.documentElement.classList.remove('dark-theme');
    }

    // Mettre à jour la méta-tag de couleur du thème pour les appareils mobiles
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#121212' : '#f5f5f5');
    }
  }, [theme]);

  // Appliquer le thème dès le chargement initial
  useEffect(() => {
    // Appliquer le thème initial immédiatement pour éviter le flash
    const currentTheme = localStorage.getItem('redTetrisTheme') || detectSystemTheme();
    if (currentTheme === 'dark') {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.add('light-theme');
    }

    // Écouter les changements de préférence système
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const userSelectedTheme = localStorage.getItem('redTetrisTheme');
      if (!userSelectedTheme) {
        setTheme(detectSystemTheme());
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else if (mediaQuery.addListener) {
      // Pour compatibilité avec anciens navigateurs
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  // Toggle entre thème clair et sombre
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  return { theme, toggleTheme };
};
