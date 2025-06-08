# Scripts de Coverage RED TETRIS

## Vue d'ensemble

Ce dossier contient les scripts utilitaires pour gérer le coverage combiné du projet RED TETRIS (client + serveur).

## Scripts disponibles

### Depuis la racine du projet :

```bash
# Lancer tous les tests (client + serveur)
npm run test:all

# Coverage avec résumé affiché
npm run test:coverage:summary

# Coverage avec rapport combiné détaillé
npm run test:coverage:all

# Tests serveur uniquement
npm run test:server

# Tests client uniquement
npm run test:client
```

## Détail des scripts

### `npm run test:coverage:summary`
- Lance les tests avec coverage côté serveur
- Lance les tests avec coverage côté client
- Affiche les résultats séparément

### `npm run test:coverage:all`
- Lance les tests avec coverage des deux côtés
- Exécute le script `combineCoverage.js` pour un rapport unifié
- Affiche le coverage global et l'état de l'objectif 70%

### `combineCoverage.js`
Script Node.js qui :
- Lit les rapports de coverage JSON générés par Vitest
- Combine les métriques server + client
- Affiche un rapport unifié avec émojis
- Indique si l'objectif de 70% est atteint

## Fichiers de coverage

Les rapports sont générés dans :
- `server/coverage/coverage-summary.json`
- `client/coverage/coverage-summary.json`

## Exemple de sortie

```
🔍 RED TETRIS - RAPPORT DE COVERAGE COMBINÉ

============================================================

🖥️  SERVER:
  📊 Statements: 84.32% (123/146)
  🌿 Branches:   78.95% (45/57)
  🔧 Functions:  89.47% (34/38)
  📝 Lines:      84.32% (123/146)

💻 CLIENT:
  📊 Statements: 66.78% (342/512)
  🌿 Branches:   82.92% (156/188)
  🔧 Functions:  87.36% (76/87)
  📝 Lines:      66.78% (342/512)

🎯 GLOBAL (SERVER + CLIENT):
  📊 Statements: 70.73% (465/658)
  🌿 Branches:   82.04% (201/245)
  🔧 Functions:  88.00% (110/125)
  📝 Lines:      70.73% (465/658)

📈 OBJECTIF 70%:
✅ Objectif ATTEINT ! 🎉
```

## Objectif de coverage

L'objectif fixé est de **70% pour statements et lines**.

Le script indique automatiquement si l'objectif est atteint et combien il reste à couvrir le cas échéant.
