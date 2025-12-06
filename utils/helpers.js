const { DIGIT_MAP, PATTI_FAMILIES, JODI_FAMILIES } = require('../config/constants');

// Calculate jodi sum (for family classification)
const calculateJodiSum = (jodi) => {
  const digits = jodi.split('').map(Number);
  const sum = digits.reduce((a, b) => a + b, 0);
  return sum % 10; // Single digit sum
};

// Get jodi family members
const getJodiFamily = (jodi) => {
  const sum = calculateJodiSum(jodi);
  return JODI_FAMILIES[sum] || [];
};

// Get all related jodis (family + mirrors)
const getAllRelatedJodis = (jodi) => {
  const related = new Set();
  
  // Add original jodi
  related.add(jodi);
  
  // Add mirror jodi
  const mirrorJodi = calculateMirrorJodi(jodi);
  related.add(mirrorJodi);
  
  // Add all family members
  const family = getJodiFamily(jodi);
  family.forEach(familyJodi => related.add(familyJodi));
  
  // Add mirrors of all family members
  family.forEach(familyJodi => {
    const familyMirror = calculateMirrorJodi(familyJodi);
    related.add(familyMirror);
  });
  
  return Array.from(related);
};

// Cut patti calculation
const calculateCutPatti = (patti) => {
  const cutDigits = patti.split('').map(digit => DIGIT_MAP[digit]);
  const sortedCutDigits = cutDigits.sort((a, b) => a - b);
  return sortedCutDigits.join('');
};

// Mirror jodi calculation
const calculateMirrorJodi = (jodi) => {
  const digits = jodi.split('');
  const mirrorDigits = digits.map(digit => DIGIT_MAP[digit]);
  return mirrorDigits.join('');
};

// Get all related pattis (family + cut) for a given patti
const getAllRelatedPattis = (patti) => {
  const related = new Set();
  related.add(patti);
  
  const cutPatti = calculateCutPatti(patti);
  related.add(cutPatti);
  
  for (const [sum, familyPattis] of Object.entries(PATTI_FAMILIES)) {
    if (familyPattis.includes(patti)) {
      familyPattis.forEach(familyPatti => related.add(familyPatti));
    }
  }
  
  for (const [sum, familyPattis] of Object.entries(PATTI_FAMILIES)) {
    if (familyPattis.includes(cutPatti)) {
      familyPattis.forEach(familyPatti => related.add(familyPatti));
    }
  }
  
  return Array.from(related);
};

// Get patti family
const getPattiFamily = (patti) => {
  for (const [sum, familyPattis] of Object.entries(PATTI_FAMILIES)) {
    if (familyPattis.includes(patti)) {
      return {
        sum: parseInt(sum),
        members: familyPattis
      };
    }
  }
  return null;
};

// Get top N indexes from array
const getTopIndexes = (arr, topN = 5) => {
  return arr
    .map((value, index) => ({ value, index }))
    .sort((a, b) => b.value - a.value)
    .slice(0, topN)
    .map(x => x.index);
};

// Filter top pattis from family based on frequency
const getTopPattisFromFamily = (family, frequencyMap, topN = 5) => {
  if (!family || !Array.isArray(family)) return [];
  
  return family
    .map(patti => ({ patti, freq: frequencyMap[patti] || 0 }))
    .sort((a, b) => b.freq - a.freq)
    .slice(0, topN)
    .map(item => item.patti);
};

// Check if patti appeared recently
const isRecent = (patti, data, days) => {
  const recentData = data.slice(-days);
  return recentData.some(day => day.open === patti || day.close === patti);
};

// Calculate probability distribution
const calculateProbabilityDistribution = (data) => {
  const distributions = {
    digitDistribution: Array(10).fill(0),
    sumDistribution: Array(10).fill(0),
    pairDistribution: {},
    totalSamples: data.length * 2 // open + close for each day
  };
  
  data.forEach(day => {
    // Analyze digit frequency
    [...day.open.split(''), ...day.close.split('')].forEach(digit => {
      const num = parseInt(digit);
      if (!isNaN(num) && num >= 0 && num <= 9) {
        distributions.digitDistribution[num]++;
      }
    });
    
    // Analyze sum patterns
    const openSum = day.open.split('').reduce((a, b) => a + parseInt(b), 0) % 10;
    const closeSum = day.close.split('').reduce((a, b) => a + parseInt(b), 0) % 10;
    
    if (openSum >= 0 && openSum <= 9) distributions.sumDistribution[openSum]++;
    if (closeSum >= 0 && closeSum <= 9) distributions.sumDistribution[closeSum]++;
    
    // Analyze pairs
    const jodi = day.jodi;
    distributions.pairDistribution[jodi] = (distributions.pairDistribution[jodi] || 0) + 1;
  });
  
  // Convert counts to probabilities
  distributions.digitProbabilities = distributions.digitDistribution.map(
    count => count / (data.length * 6) // 6 digits per day (3 open + 3 close)
  );
  
  distributions.sumProbabilities = distributions.sumDistribution.map(
    count => count / (data.length * 2) // 2 sums per day (open + close)
  );
  
  return distributions;
};

const displayPrecise4JodiPredictions = (predictions) => {
  if (!predictions || !predictions.final4Jodis) return;
  
  const { final4Jodis, detailedPredictions } = predictions;
  
  console.log('\n✨' + '='.repeat(70));
  console.log('✨ FINAL 4-JODI PREDICTIONS');
  console.log('✨' + '='.repeat(70));
  
  console.log(`\n🎯 TOP 4 RECOMMENDED JODIS:`);
  console.log('   ' + '─'.repeat(60));
  
  final4Jodis.forEach((jodi, index) => {
    const family = calculateJodiSum(jodi);
    const mirror = calculateMirrorJodi(jodi);
    const reverse = jodi.split('').reverse().join('');
    
    const predDetails = detailedPredictions.combined?.find(p => p.jodi === jodi);
    
    console.log(`\n   ${index + 1}. ${jodi.padEnd(5)}`);
    console.log(`      ├── Family: Sum ${family}`);
    console.log(`      ├── Mirror: ${mirror} | Reverse: ${reverse}`);
    
    if (predDetails) {
      console.log(`      ├── Confidence: ${predDetails.methodCount} methods`);
      console.log(`      ├── Total Score: ${predDetails.totalScore}`);
      if (predDetails.reasons && predDetails.reasons.length > 0) {
        console.log(`      └── Top Reason: ${predDetails.reasons[0]}`);
      }
    }
    console.log('   ' + '─'.repeat(60));
  });
  
  console.log('\n🔍 PREDICTION METHOD CONTRIBUTION:');
  const methods = ['matrixMethod', 'patternMethod', 'gapMethod', 'familyMethod', 'mirrorMethod'];
  methods.forEach(method => {
    const preds = detailedPredictions[method];
    if (preds && preds.length > 0) {
      const contributingJodis = preds
        .filter(p => final4Jodis.includes(p.jodi))
        .map(p => p.jodi);
      if (contributingJodis.length > 0) {
        console.log(`   ${method.replace('Method', '')}: ${contributingJodis.join(', ')}`);
      }
    }
  });
  
  console.log('\n📈 STRATEGY: Play all 4 jodis for maximum coverage');
  console.log('✨' + '='.repeat(70));
};


module.exports = {
  calculateJodiSum,
  getJodiFamily,
  getAllRelatedJodis,
  calculateCutPatti,
  calculateMirrorJodi,
  getAllRelatedPattis,
  getPattiFamily,
  getTopIndexes,
  getTopPattisFromFamily,
  isRecent,
  calculateProbabilityDistribution,
  displayPrecise4JodiPredictions
};