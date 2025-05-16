import React, { useState, useEffect } from 'react';

const PageTransition = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Petit délai pour permettre au navigateur de gérer le rendu initial
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`page-transition ${
        isVisible ? 'page-visible' : 'page-hidden'
      }`}
    >
      {children}
    </div>
  );
};

export default PageTransition;
