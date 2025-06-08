#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Script pour combiner et afficher un résumé du coverage client + serveur
 */

function calculateSummaryFromFinal(coverageData) {
  let totalStatements = 0, coveredStatements = 0;
  let totalBranches = 0, coveredBranches = 0;
  let totalFunctions = 0, coveredFunctions = 0;
  let totalLines = 0, coveredLines = 0;

  Object.values(coverageData).forEach(fileData => {
    // Statements
    if (fileData.s) {
      const statements = Object.values(fileData.s);
      totalStatements += statements.length;
      coveredStatements += statements.filter(count => count > 0).length;
    }

    // Branches
    if (fileData.b) {
      Object.values(fileData.b).forEach(branchArray => {
        totalBranches += branchArray.length;
        coveredBranches += branchArray.filter(count => count > 0).length;
      });
    }

    // Functions
    if (fileData.f) {
      const functions = Object.values(fileData.f);
      totalFunctions += functions.length;
      coveredFunctions += functions.filter(count => count > 0).length;
    }

    // Lines - utilisons statementMap pour calculer les lignes
    if (fileData.statementMap && fileData.s) {
      const linesCovered = new Set();
      const linesTotal = new Set();

      Object.keys(fileData.statementMap).forEach(stmtId => {
        const stmt = fileData.statementMap[stmtId];
        const line = stmt.start.line;
        linesTotal.add(line);

        if (fileData.s[stmtId] > 0) {
          linesCovered.add(line);
        }
      });

      totalLines += linesTotal.size;
      coveredLines += linesCovered.size;
    }
  });

  return {
    statements: {
      covered: coveredStatements,
      total: totalStatements,
      pct: totalStatements > 0 ? (coveredStatements / totalStatements * 100) : 0
    },
    branches: {
      covered: coveredBranches,
      total: totalBranches,
      pct: totalBranches > 0 ? (coveredBranches / totalBranches * 100) : 0
    },
    functions: {
      covered: coveredFunctions,
      total: totalFunctions,
      pct: totalFunctions > 0 ? (coveredFunctions / totalFunctions * 100) : 0
    },
    lines: {
      covered: coveredLines,
      total: totalLines,
      pct: totalLines > 0 ? (coveredLines / totalLines * 100) : 0
    }
  };
}

function readCoverageReport(projectPath, projectName) {
  const coveragePath = path.join(projectPath, 'coverage', 'coverage-final.json');

  try {
    if (fs.existsSync(coveragePath)) {
      const data = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      const summary = calculateSummaryFromFinal(data);
      return {
        name: projectName,
        data: summary,
        exists: true
      };
    }
  } catch (error) {
    console.error(`Erreur lecture coverage ${projectName}:`, error.message);
  }

  return {
    name: projectName,
    data: null,
    exists: false
  };
}

function calculateCombinedCoverage(serverCov, clientCov) {
  if (!serverCov.exists || !clientCov.exists) {
    return null;
  }

  const server = serverCov.data;
  const client = clientCov.data;

  const combined = {
    statements: {
      covered: server.statements.covered + client.statements.covered,
      total: server.statements.total + client.statements.total,
      pct: 0
    },
    branches: {
      covered: server.branches.covered + client.branches.covered,
      total: server.branches.total + client.branches.total,
      pct: 0
    },
    functions: {
      covered: server.functions.covered + client.functions.covered,
      total: server.functions.total + client.functions.total,
      pct: 0
    },
    lines: {
      covered: server.lines.covered + client.lines.covered,
      total: server.lines.total + client.lines.total,
      pct: 0
    }
  };

  // Calcul des pourcentages
  combined.statements.pct = combined.statements.total > 0 ?
    (combined.statements.covered / combined.statements.total * 100) : 0;
  combined.branches.pct = combined.branches.total > 0 ?
    (combined.branches.covered / combined.branches.total * 100) : 0;
  combined.functions.pct = combined.functions.total > 0 ?
    (combined.functions.covered / combined.functions.total * 100) : 0;
  combined.lines.pct = combined.lines.total > 0 ?
    (combined.lines.covered / combined.lines.total * 100) : 0;

  return combined;
}

function formatCoverage(coverage, name) {
  if (!coverage) {
    return `${name}: Pas de données de coverage disponibles`;
  }

  return `${name}:
  📊 Statements: ${coverage.statements.pct.toFixed(2)}% (${coverage.statements.covered}/${coverage.statements.total})
  🌿 Branches:   ${coverage.branches.pct.toFixed(2)}% (${coverage.branches.covered}/${coverage.branches.total})
  🔧 Functions:  ${coverage.functions.pct.toFixed(2)}% (${coverage.functions.covered}/${coverage.functions.total})
  📝 Lines:      ${coverage.lines.pct.toFixed(2)}% (${coverage.lines.covered}/${coverage.lines.total})`;
}

function main() {
  console.log('\n🔍 RED TETRIS - RAPPORT DE COVERAGE COMBINÉ\n');
  console.log('='.repeat(60));

  // Lecture des rapports de coverage
  const serverCov = readCoverageReport('./server', 'SERVER');
  const clientCov = readCoverageReport('./client', 'CLIENT');

  // Affichage des coverages individuels
  if (serverCov.exists) {
    console.log('\n' + formatCoverage(serverCov.data, '🖥️  SERVER'));
  } else {
    console.log('\n🖥️  SERVER: ❌ Pas de rapport de coverage trouvé');
  }

  if (clientCov.exists) {
    console.log('\n' + formatCoverage(clientCov.data, '💻 CLIENT'));
  } else {
    console.log('\n💻 CLIENT: ❌ Pas de rapport de coverage trouvé');
  }

  // Calcul et affichage du coverage combiné
  const combined = calculateCombinedCoverage(serverCov, clientCov);
  if (combined) {
    console.log('\n' + formatCoverage(combined, '🎯 GLOBAL (SERVER + CLIENT)'));

    // Status de l'objectif 70%
    console.log('\n📈 OBJECTIF 70%:');
    const statements = combined.statements.pct;
    const lines = combined.lines.pct;

    if (statements >= 70 && lines >= 70) {
      console.log('✅ Objectif ATTEINT ! 🎉');
    } else {
      console.log(`⚠️  Statements: ${statements >= 70 ? '✅' : '❌'} ${statements.toFixed(2)}%`);
      console.log(`⚠️  Lines: ${lines >= 70 ? '✅' : '❌'} ${lines.toFixed(2)}%`);
      console.log(`📊 Il reste ${Math.max(0, 70 - statements).toFixed(2)}% pour statements et ${Math.max(0, 70 - lines).toFixed(2)}% pour lines`);
    }
  } else {
    console.log('\n❌ Impossible de calculer le coverage combiné');
  }

  console.log('\n' + '='.repeat(60));
  console.log('💡 Pour générer les rapports: npm run test:coverage:summary\n');
}

main();
