const { calculateCutPatti } = require('../utils/helpers');

// Generate analysis reports and visualizations
const generateAnalysisReport = (predictions, analysis, fileName) => {
  const report = {
    summary: generateSummary(predictions, analysis),
    keyFindings: extractKeyFindings(predictions),
    recommendations: generateRecommendations(predictions),
    metadata: {
      analysisDate: new Date().toISOString(),
      fileName,
      dataPoints: analysis.data.length
    }
  };
  
  return report;
};

const generateSummary = (predictions, analysis) => {
  const { probabilityDistribution } = analysis;
  
  return {
    totalPredictions: predictions.panelJodis?.length || 0,
    confidenceLevel: calculateOverallConfidence(predictions),
    dataQuality: assessDataQuality(analysis),
    patternStrength: evaluatePatternStrength(predictions),
    probabilityInsights: extractProbabilityInsights(probabilityDistribution)
  };
};

const calculateOverallConfidence = (predictions) => {
  if (!predictions.panelJodis || predictions.panelJodis.length === 0) return 0;
  
  const scores = predictions.panelJodis.map(j => j.score);
  const maxPossible = Math.max(...scores);
  const topScore = predictions.panelJodis[0].score;
  
  return Math.round((topScore / maxPossible) * 100);
};

const assessDataQuality = (analysis) => {
  const { data } = analysis;
  if (data.length === 0) return 'Poor';
  
  const qualityScore = Math.min(100, Math.round((data.length / 100) * 100));
  
  if (qualityScore >= 80) return 'Excellent';
  if (qualityScore >= 60) return 'Good';
  if (qualityScore >= 40) return 'Fair';
  return 'Poor';
};

const evaluatePatternStrength = (predictions) => {
  if (!predictions.patternAnalysis) return 'Unknown';
  
  const patterns = predictions.patternAnalysis;
  const patternCount = Object.values(patterns).reduce((count, arr) => count + arr.length, 0);
  
  if (patternCount > 50) return 'Strong';
  if (patternCount > 25) return 'Moderate';
  if (patternCount > 10) return 'Weak';
  return 'Very Weak';
};

const extractProbabilityInsights = (probabilityDistribution) => {
  if (!probabilityDistribution) return [];
  
  const insights = [];
  const { digitProbabilities, sumProbabilities } = probabilityDistribution;
  
  const topDigits = digitProbabilities
    .map((prob, digit) => ({ digit, prob }))
    .sort((a, b) => b.prob - a.prob)
    .slice(0, 3);
  
  if (topDigits.length > 0) {
    insights.push(`Most frequent digits: ${topDigits.map(d => d.digit).join(', ')}`);
  }
  
  const topSums = sumProbabilities
    .map((prob, sum) => ({ sum, prob }))
    .sort((a, b) => b.prob - a.prob)
    .slice(0, 2);
  
  if (topSums.length > 0) {
    insights.push(`Most common sums: ${topSums.map(s => s.sum).join(', ')}`);
  }
  
  return insights;
};

const extractKeyFindings = (predictions) => {
  const findings = [];
  
  if (predictions.combinedPredictions?.panelJodis) {
    const topJodi = predictions.combinedPredictions.panelJodis[0];
    if (topJodi) {
      findings.push(`Highest confidence jodi: ${topJodi.jodi} (score: ${topJodi.score})`);
    }
  }
  
  if (predictions.jackpotPredictions?.topJackpotPattis) {
    findings.push(`Jackpot pattis identified: ${predictions.jackpotPredictions.topJackpotPattis.length}`);
  }
  
  if (predictions.patternAnalysis) {
    const patternCount = Object.values(predictions.patternAnalysis).reduce((count, arr) => count + arr.length, 0);
    findings.push(`Patterns detected: ${patternCount}`);
  }
  
  return findings;
};

const generateRecommendations = (predictions) => {
  const recommendations = [];
  
  if (predictions.combinedPredictions?.panelJodis) {
    const topJodis = predictions.combinedPredictions.panelJodis.slice(0, 3).map(j => j.jodi);
    recommendations.push(`Focus on jodis: ${topJodis.join(', ')}`);
  }
  
  if (predictions.jackpotPredictions?.detailedPattiInfo) {
    const highConfidencePattis = predictions.jackpotPredictions.detailedPattiInfo
      .filter(p => p.score > 1000)
      .slice(0, 3)
      .map(p => p.patti);
    
    if (highConfidencePattis.length > 0) {
      recommendations.push(`High-confidence pattis: ${highConfidencePattis.join(', ')}`);
    }
  }
  
  if (predictions.historicalAccuracy !== undefined) {
    if (predictions.historicalAccuracy > 70) {
      recommendations.push('Historical accuracy is strong - high confidence in predictions');
    } else if (predictions.historicalAccuracy < 40) {
      recommendations.push('Historical accuracy is low - use predictions with caution');
    }
  }
  
  return recommendations;
};

// Optimized display functions
const displayPanelPredictions = (guesses) => {
  if (!guesses.combinedPredictions) return;
  
  const { panelJodis, panelOpenPattis, panelClosePattis } = guesses.combinedPredictions;
  
  console.log(`\n🎯 OPTIMIZED PANEL PREDICTIONS:`);
  
  // Display only top 5 panel jodis
  console.log(`\n📊 PANEL JODIS (Top 5):`);
  panelJodis.slice(0, 5).forEach((jodi, index) => {
    console.log(`   ${(index + 1).toString().padStart(2, ' ')}. ${jodi.jodi} - Score: ${jodi.score}`);
  });
  
  // Display only top 5 panel open pattis
  console.log(`\n📈 PANEL OPEN PATTIS (Top 5):`);
  panelOpenPattis.slice(0, 5).forEach((patti, index) => {
    const cutPatti = calculateCutPatti(patti.patti);
    console.log(`   ${(index + 1).toString().padStart(2, ' ')}. ${patti.patti} → Cut: ${cutPatti} - Score: ${patti.score}`);
  });
  
  // Display only top 5 panel close pattis
  console.log(`\n📉 PANEL CLOSE PATTIS (Top 5):`);
  panelClosePattis.slice(0, 5).forEach((patti, index) => {
    const cutPatti = calculateCutPatti(patti.patti);
    console.log(`   ${(index + 1).toString().padStart(2, ' ')}. ${patti.patti} → Cut: ${cutPatti} - Score: ${patti.score}`);
  });
};

// Optimized jackpot display
const displayJackpotPredictions = (jackpotPredictions) => {
  console.log(`\n💰 OPTIMIZED JACKPOT PREDICTIONS`);
  
  console.log(`\n🎰 TOP 8 JACKPOT PATTIS:`);
  console.log(`   ${jackpotPredictions.topJackpotPattis.slice(0, 8).join(', ')}`);
  
  if (jackpotPredictions.detailedPattiInfo.length > 0) {
    console.log(`\n📊 TOP 6 DETAILED ANALYSIS:`);
    jackpotPredictions.detailedPattiInfo.slice(0, 6).forEach((info, index) => {
      const indicators = [];
      if (info.inTopGuesses) indicators.push('🎯');
      if (info.inFamily) indicators.push('👪');
      
      console.log(`   ${(index + 1).toString().padStart(2, ' ')}. ${info.patti} → Cut: ${info.cutPatti} | Score: ${info.score} ${indicators.join('')}`);
    });
  }
  
  console.log(`\n🎰 TOP 6 JACKPOT JODIS: ${jackpotPredictions.topJackpotJodis.slice(0, 6).join(', ')}`);
};

module.exports = {
  generateAnalysisReport,
  displayPanelPredictions,
  displayJackpotPredictions,
  generateSummary,
  extractKeyFindings,
  generateRecommendations
};