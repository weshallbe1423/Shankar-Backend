const { calculateMirrorJodi, calculateJodiSum, getAllRelatedJodis, getAllRelatedPattis } = require('../utils/helpers');
const { JODI_FAMILIES } = require('../config/constants');

// Enhanced Panel-Based Prediction System
const generatePanelBasedPredictions = (data, daysLimit = 30) => {
  const recentData = data.slice(-daysLimit);
  
  // Panel analysis for both jodi and patti
  const jodiPanelStats = new Map();
  const openPattiPanelStats = new Map();
  const closePattiPanelStats = new Map();
  
  recentData.forEach((day, index) => {
    const { open, jodi, close } = day;
    
    // Jodi Panel Analysis
    const allRelatedJodis = getAllRelatedJodis(jodi);
    
    allRelatedJodis.forEach(panelJodi => {
      const stats = jodiPanelStats.get(panelJodi) || { 
        hits: 0, 
        appearances: 0,
        lastSeen: 0,
        frequency: 0
      };
      stats.appearances++;
      stats.lastSeen = recentData.length - index;
      if (panelJodi === jodi) {
        stats.hits++;
      }
      jodiPanelStats.set(panelJodi, stats);
    });
    
    // Open Patti Panel Analysis
    const openRelatedPattis = getAllRelatedPattis(open);
    openRelatedPattis.forEach(panelPatti => {
      const stats = openPattiPanelStats.get(panelPatti) || { 
        hits: 0, 
        appearances: 0,
        lastSeen: 0,
        asOpen: 0,
        asClose: 0
      };
      stats.appearances++;
      stats.lastSeen = recentData.length - index;
      if (panelPatti === open) {
        stats.hits++;
        stats.asOpen++;
      }
      openPattiPanelStats.set(panelPatti, stats);
    });
    
    // Close Patti Panel Analysis
    const closeRelatedPattis = getAllRelatedPattis(close);
    closeRelatedPattis.forEach(panelPatti => {
      const stats = closePattiPanelStats.get(panelPatti) || { 
        hits: 0, 
        appearances: 0,
        lastSeen: 0,
        asOpen: 0,
        asClose: 0
      };
      stats.appearances++;
      stats.lastSeen = recentData.length - index;
      if (panelPatti === close) {
        stats.hits++;
        stats.asClose++;
      }
      closePattiPanelStats.set(panelPatti, stats);
    });
  });
  
  return {
    jodiPanelStats,
    openPattiPanelStats,
    closePattiPanelStats
  };
};

// Pattern-based Prediction Enhancement
const analyzePatternBasedPredictions = (data, daysLimit = 30) => {
  const recentData = data.slice(-daysLimit);
  const patterns = {
    sequential: [],
    repeating: [],
    mirrorPatterns: [],
    familySequences: [],
    gapPatterns: []
  };
  
  // Analyze sequential patterns
  for (let i = 1; i < recentData.length; i++) {
    const prev = recentData[i - 1];
    const current = recentData[i];
    
    // Sequential jodi patterns
    const prevJodi = parseInt(prev.jodi);
    const currentJodi = parseInt(current.jodi);
    
    if (Math.abs(currentJodi - prevJodi) <= 5) {
      patterns.sequential.push(current.jodi);
    }
    
    // Repeating digit patterns
    const currentDigits = current.jodi.split('');
    if (currentDigits[0] === currentDigits[1]) {
      patterns.repeating.push(current.jodi);
    }
    
    // Mirror pattern analysis
    const mirrorJodi = calculateMirrorJodi(current.jodi);
    if (recentData.some(day => day.jodi === mirrorJodi)) {
      patterns.mirrorPatterns.push(current.jodi);
    }
  }
  
  // Family sequence analysis
  const familySequences = analyzeFamilySequences(recentData);
  patterns.familySequences = familySequences;
  
  return patterns;
};

// Analyze family sequences
const analyzeFamilySequences = (data) => {
  const sequences = [];
  const familyHistory = [];
  
  data.forEach(day => {
    const jodiSum = calculateJodiSum(day.jodi);
    familyHistory.push(jodiSum);
  });
  
  // Look for family patterns
  for (let i = 3; i < familyHistory.length; i++) {
    const sequence = familyHistory.slice(i - 3, i);
    const nextFamily = familyHistory[i];
    
    // Check if this sequence repeats
    for (let j = 0; j < i - 3; j++) {
      const prevSequence = familyHistory.slice(j, j + 3);
      if (JSON.stringify(prevSequence) === JSON.stringify(sequence)) {
        const predictedNext = familyHistory[j + 3];
        sequences.push({
          sequence,
          predictedFamily: predictedNext,
          confidence: 1.0
        });
      }
    }
  }
  
  return sequences;
};

// Analyze recent patterns in data
const analyzeRecentPatterns = (data, days = 30) => {
  const recentData = data.slice(-days);
  const patterns = new Set();
  
  // Look for pattis that appeared multiple times recently
  const recentCount = {};
  recentData.forEach(day => {
    [day.open, day.close].forEach(patti => {
      recentCount[patti] = (recentCount[patti] || 0) + 1;
    });
  });
  
  // Add pattis that appeared at least twice in recent period
  Object.entries(recentCount).forEach(([patti, count]) => {
    if (count >= 2) {
      patterns.add(patti);
    }
  });
  
  return Array.from(patterns);
};

module.exports = {
  generatePanelBasedPredictions,
  analyzePatternBasedPredictions,
  analyzeRecentPatterns,
  analyzeFamilySequences
};