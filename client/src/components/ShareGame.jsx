import React, { useState } from 'react';

const ShareGame = ({ shareUrl }) => {
  const [copied, setCopied] = useState(false);

  // Copier le lien de partage dans le presse-papier
  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Erreur lors de la copie:', err);
      });
  };

  return (
    <div className="share-card">
      <div className="share-container">
        <div className="share-header">
          <h2 className="share-title">Inviter des joueurs</h2>
          <button
            onClick={copyShareLink}
            className="share-button"
            id="copy-link-btn"
          >
            {copied ? 'Copié !' : 'Copier le lien'}
          </button>
        </div>
        <div className="share-input-container">
        <input
          type="text"
          value={shareUrl}
          readOnly
          className="share-input"
          id="share-link"
        />
        </div>
      </div>
    </div>
  );
};

export default ShareGame;
