const { 
  getAllRelatedJodis, 
  getAllRelatedPattis, 
  calculateCutPatti, 
  getPattiFamily,
  getTopPattisFromFamily,
  getTopIndexes,
  isRecent,
  calculateJodiSum
} = require('../utils/helpers');
const { PATTI_FAMILIES, JODI_FAMILIES } = require('../config/constants');
const patternAnalyzer = require('./pattern-analyzer');

// Enhanced Panel-Based Jodi Prediction
const generateEnhancedPanelJodis = (panelAnalysis, topN = 8) => {
  const { jodiPanelStats } = panelAnalysis;
  
  const panelPredictions = Array.from(jodiPanelStats.entries())
    .map(([jodi, stats]) => {
      const hitRate = stats.hits / stats.appearances;
      const frequency = stats.appearances;
      const recency = stats.lastSeen;
      
      // Enhanced scoring formula
      const baseScore = hitRate * 100;
      const frequencyBonus = Math.log(frequency + 1) * 10;
      const recencyBonus = (1 / recency) * 50;
      
      const confidence = baseScore + frequencyBonus + recencyBonus;
      
      return {
        jodi,
        hitRate: Math.round(hitRate * 100),
        frequency,
        recency,
        confidence: Math.round(confidence * 100) / 100
      };
    })
    .filter(p => p.frequency >= 2 && p.hitRate >= 5)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, topN);
  
  return panelPredictions;
};

// Enhanced Panel-Based Ank (Patti) Prediction
const generateEnhancedPanelPattis = (panelAnalysis, type = 'open', topN = 6) => {
  const panelStats = type === 'open' ? panelAnalysis.openPattiPanelStats : panelAnalysis.closePattiPanelStats;
  
  const panelPredictions = Array.from(panelStats.entries())
    .map(([patti, stats]) => {
      const hitRate = stats.hits / stats.appearances;
      const frequency = stats.appearances;
      const recency = stats.lastSeen;
      const roleSpecific = type === 'open' ? stats.asOpen : stats.asClose;
      const roleRate = roleSpecific / stats.appearances;
      
      // Enhanced scoring for patti
      const baseScore = hitRate * 100;
      const frequencyBonus = Math.log(frequency + 1) * 15;
      const recencyBonus = (1 / recency) * 60;
      const roleBonus = roleRate * 40;
      
      const confidence = baseScore + frequencyBonus + recencyBonus + roleBonus;
      
      return {
        patti,
        hitRate: Math.round(hitRate * 100),
        frequency,
        recency,
        roleSpecific: type === 'open' ? stats.asOpen : stats.asClose,
        roleRate: Math.round(roleRate * 100),
        confidence: Math.round(confidence * 100) / 100,
        cutPatti: calculateCutPatti(patti),
        family: getPattiFamily(patti)
      };
    })
    .filter(p => p.frequency >= 2 && p.hitRate >= 3)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, topN);
  
  return panelPredictions;
};

// Smart family selection with intelligent filtering
const getOptimizedFamilyPattis = (families, frequencyMap, maxFamilies = 2, maxPattis = 4) => {
  return families
    .map(family => ({
      ...family,
      familyScore: calculateFamilyScore(family.patti, frequencyMap),
      optimizedPattis: getOptimizedPattis(family.patti, frequencyMap, maxPattis)
    }))
    .sort((a, b) => b.familyScore - a.familyScore)
    .slice(0, maxFamilies)
    .map(family => ({
      sum: family.sum,
      patti: family.optimizedPattis,
      familyScore: Math.round(family.familyScore * 100) / 100
    }));
};

// Calculate family quality score
const calculateFamilyScore = (pattis, frequencyMap) => {
  if (!pattis || pattis.length === 0) return 0;
  
  const scores = pattis.map(patti => {
    const freq = frequencyMap[patti] || 0;
    const digitVariety = calculateDigitVariety(patti);
    const patternScore = calculatePatternScore(patti);
    
    return (freq * 0.4) + (digitVariety * 0.3) + (patternScore * 0.3);
  });
  
  return scores.reduce((a, b) => a + b, 0) / scores.length;
};

// Get optimized pattis (not just highest frequency)
const getOptimizedPattis = (pattis, frequencyMap, maxPattis = 4) => {
  return pattis
    .map(patti => ({
      patti,
      frequency: frequencyMap[patti] || 0,
      digitVariety: calculateDigitVariety(patti),
      patternScore: calculatePatternScore(patti),
      combinedScore: calculatePattiScore(patti, frequencyMap)
    }))
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, maxPattis)
    .map(item => item.patti);
};

// Calculate patti quality score
const calculatePattiScore = (patti, frequencyMap) => {
  const freq = frequencyMap[patti] || 0;
  const digitVariety = calculateDigitVariety(patti);
  const patternScore = calculatePatternScore(patti);
  
  return (freq * 0.4) + (digitVariety * 0.3) + (patternScore * 0.3);
};

// Calculate digit variety in patti
const calculateDigitVariety = (patti) => {
  const uniqueDigits = new Set(patti.split('')).size;
  return uniqueDigits / 3;
};

// Calculate pattern quality
const calculatePatternScore = (patti) => {
  const digits = patti.split('').map(Number);
  
  const isSequential = Math.abs(digits[0] - digits[1]) === 1 || 
                       Math.abs(digits[1] - digits[2]) === 1;
  
  const hasMirror = digits.some(d => [0,5,1,6,2,7,3,8,4,9].includes(d));
  
  const uniqueCount = new Set(digits).size;
  const repetitionPenalty = uniqueCount === 1 ? 0.3 : 
                           uniqueCount === 2 ? 0.6 : 1.0;
  
  let score = 0.5;
  
  if (isSequential) score += 0.2;
  if (hasMirror) score += 0.2;
  score *= repetitionPenalty;
  
  return Math.min(score, 1.0);
};

// Combined Prediction Engine
const generateCombinedPredictions = (data, daysLimit = 30) => {
  const panelAnalysis = patternAnalyzer.generatePanelBasedPredictions(data, daysLimit);
  
  const panelJodis = generateEnhancedPanelJodis(panelAnalysis, 8);
  const panelOpenPattis = generateEnhancedPanelPattis(panelAnalysis, 'open', 6);
  const panelClosePattis = generateEnhancedPanelPattis(panelAnalysis, 'close', 6);
  
  const patternAnalysis = patternAnalyzer.analyzePatternBasedPredictions(data, daysLimit);
  
  const combinedJodis = combineJodiPredictions(panelJodis, patternAnalysis, data);
  const combinedPattis = combinePattiPredictions(panelOpenPattis, panelClosePattis, data);
  
  return {
    panelJodis: combinedJodis,
    panelOpenPattis: combinedPattis.open,
    panelClosePattis: combinedPattis.close,
    patternAnalysis,
    panelAnalysis
  };
};

// Combine jodi predictions with weights
const combineJodiPredictions = (panelJodis, patternAnalysis, data) => {
  const scoredJodis = new Map();
  
  panelJodis.forEach((jodi, index) => {
    const weight = 100 - (index * 3);
    scoredJodis.set(jodi.jodi, (scoredJodis.get(jodi.jodi) || 0) + weight);
  });
  
  patternAnalysis.sequential.forEach(jodi => {
    scoredJodis.set(jodi, (scoredJodis.get(jodi) || 0) + 25);
  });
  
  patternAnalysis.repeating.forEach(jodi => {
    scoredJodis.set(jodi, (scoredJodis.get(jodi) || 0) + 30);
  });
  
  patternAnalysis.mirrorPatterns.forEach(jodi => {
    scoredJodis.set(jodi, (scoredJodis.get(jodi) || 0) + 35);
  });
  
  patternAnalysis.familySequences.forEach(seq => {
    const familyJodis = JODI_FAMILIES[seq.predictedFamily] || [];
    familyJodis.forEach(jodi => {
      scoredJodis.set(jodi, (scoredJodis.get(jodi) || 0) + (40 * seq.confidence));
    });
  });
  
  return Array.from(scoredJodis.entries())
    .map(([jodi, score]) => ({ jodi, score: Math.round(score) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
};

// Combine patti predictions
const combinePattiPredictions = (panelOpenPattis, panelClosePattis, data) => {
  const scoredOpenPattis = new Map();
  const scoredClosePattis = new Map();
  
  panelOpenPattis.forEach((patti, index) => {
    const weight = 120 - (index * 4);
    scoredOpenPattis.set(patti.patti, weight);
  });
  
  panelClosePattis.forEach((patti, index) => {
    const weight = 120 - (index * 4);
    scoredClosePattis.set(patti.patti, weight);
  });
  
  panelOpenPattis.forEach(openPatti => {
    if (panelClosePattis.some(closePatti => closePatti.patti === openPatti.patti)) {
      scoredOpenPattis.set(openPatti.patti, (scoredOpenPattis.get(openPatti.patti) || 0) + 50);
      scoredClosePattis.set(openPatti.patti, (scoredClosePattis.get(openPatti.patti) || 0) + 50);
    }
  });
  
  return {
    open: Array.from(scoredOpenPattis.entries())
      .map(([patti, score]) => ({ patti, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6),
    close: Array.from(scoredClosePattis.entries())
      .map(([patti, score]) => ({ patti, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
  };
};

// Generate family and jodi-based guesses
const generateGuesses = (analysis, daysLimit) => {
  const { digitFrequency, openSumFrequency, closeSumFrequency, pattiFrequencyMap, data } = analysis;

  // Get frequent digits
  const frequentDigits = digitFrequency
    .map((count, digit) => ({ digit, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(item => item.digit);

  const topOpenSums = getTopIndexes(openSumFrequency, 3);
  const topCloseSums = getTopIndexes(closeSumFrequency, 3);
  
  // Enhanced jodi analysis
  const jodiPredictions = generateEnhancedJodiPredictions(data, 6);
  const topJodis = jodiPredictions.topJodis;

  // Combined panel-based predictions
  const combinedPredictions = generateCombinedPredictions(data, daysLimit);

  // ENHANCED: Family predictions with crossover analysis
  const topOpenFamilies = getOptimizedFamilyPattis(
    topOpenSums.map(sum => ({ sum, patti: PATTI_FAMILIES[sum] || [] })),
    pattiFrequencyMap,
    data, // Pass data for crossover analysis
    2,
    4
  );

  const topCloseFamilies = getOptimizedFamilyPattis(
    topCloseSums.map(sum => ({ sum, patti: PATTI_FAMILIES[sum] || [] })),
    pattiFrequencyMap,
    data, // Pass data for crossover analysis
    2,
    4
  );

  // Combine and filter based on frequent digits
  const allGuesses = new Set();
  [...topOpenFamilies, ...topCloseFamilies].forEach(f => {
    if (f.patti && f.patti.length > 0) {
      f.patti.forEach(p => allGuesses.add(p));
    }
  });

  // Filter guesses that contain at least one frequent digit
  let top5Guesses = Array.from(allGuesses).filter(patti =>
    frequentDigits.some(d => patti.includes(d.toString()))
  ).slice(0, 5);

  // Fallback if no guesses
  if (top5Guesses.length === 0) {
    top5Guesses = ['127', '136', '145', '128', '137'].slice(0, 5);
  }

  // ENHANCED: Jackpot predictions with crossover analysis
  const jackpotPredictions = generateEnhancedJackpotPredictions(
    analysis, 
    topOpenFamilies, 
    topCloseFamilies, 
    top5Guesses,
    topJodis,
    data,
    daysLimit
  );

  return {
    frequentDigits,
    topOpenSums: topOpenSums.slice(0, 2),
    topCloseSums: topCloseSums.slice(0, 2),
    topOpenFamilies,
    topCloseFamilies,
    topJodis,
    jodiAnalysis: jodiPredictions.detailedAnalysis,
    combinedPredictions,
    top5Guesses,
    jackpotPredictions,
    // NEW: Include crossover analysis in response
    crossoverInsights: jackpotPredictions.crossoverAnalysis
  };
};

// Enhanced Jodi Prediction
const generateEnhancedJodiPredictions = (data, topN = 6) => {
  const jodiFrequency = Array(100).fill(0);
  
  data.forEach(day => {
    const jodiNum = parseInt(day.jodi, 10);
    if (!isNaN(jodiNum) && jodiNum >= 0 && jodiNum < 100) {
      jodiFrequency[jodiNum]++;
    }
  });
  
  const scoredJodis = [];
  for (let jodi = 0; jodi < 100; jodi++) {
    const jodiStr = jodi.toString().padStart(2, '0');
    const frequency = jodiFrequency[jodi] || 0;
    
    if (frequency > 0) {
      scoredJodis.push({
        jodi: jodiStr,
        frequency,
        score: frequency
      });
    }
  }
  
  const finalJodis = scoredJodis
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(item => item.jodi);

  return {
    topJodis: finalJodis,
    detailedAnalysis: scoredJodis.slice(0, 5)
  };
};

// Optimized jackpot predictions
const generateOptimizedJackpotPredictions = (analysis, topOpenFamilies, topCloseFamilies, top5Guesses, topJodis, data, daysLimit) => {
  const { pattiFrequencyMap } = analysis;
  
  const jackpotCandidates = new Map();
  
  [...topOpenFamilies, ...topCloseFamilies].forEach(family => {
    family.patti.forEach(patti => {
      const currentScore = jackpotCandidates.get(patti) || 0;
      jackpotCandidates.set(patti, currentScore + 200);
    });
  });
  
  top5Guesses.forEach(patti => {
    jackpotCandidates.set(patti, (jackpotCandidates.get(patti) || 0) + 500);
  });
  
  const recentPatterns = patternAnalyzer.analyzeRecentPatterns(data, 15);
  recentPatterns.forEach(patti => {
    if (pattiFrequencyMap[patti] >= 2) {
      jackpotCandidates.set(patti, (jackpotCandidates.get(patti) || 0) + 300);
    }
  });
  
  const scoredCandidates = Array.from(jackpotCandidates.entries())
    .map(([patti, baseScore]) => {
      const frequency = pattiFrequencyMap[patti] || 0;
      const qualityScore = calculatePattiScore(patti, pattiFrequencyMap);
      const finalScore = baseScore + (frequency * 50) + (qualityScore * 100);
      
      return {
        patti,
        cutPatti: calculateCutPatti(patti),
        score: Math.round(finalScore),
        frequency,
        qualityScore: Math.round(qualityScore * 100) / 100,
        inTopGuesses: top5Guesses.includes(patti),
        inFamily: [...topOpenFamilies, ...topCloseFamilies].some(f => f.patti.includes(patti))
      };
    })
    .filter(candidate => candidate.score >= 800 && candidate.qualityScore >= 0.5)
    .sort((a, b) => b.score - a.score);
  
  return {
    topJackpotPattis: scoredCandidates.slice(0, 8).map(p => p.patti),
    topJackpotJodis: topJodis.slice(0, 6),
    detailedPattiInfo: scoredCandidates.slice(0, 6)
  };
};

module.exports = {
  generateCombinedPredictions,
  generateGuesses,
  generateEnhancedPanelJodis,
  generateEnhancedPanelPattis,
  getOptimizedFamilyPattis
};