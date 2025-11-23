const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Import modules with proper relative paths
const dataProcessor = require('./modules/data-processor');
const predictionEngine = require('./modules/prediction-engine');
const riskAssessor = require('./modules/risk-assessor');
const visualization = require('./modules/visualization');
const { CONFIG } = require('./config/constants');

// Fix path for date-based guesses
const DATE_BASE_GUESS_PATH = path.join(__dirname, 'utillData', 'Dhanasree.json');
let DATE_BASE_GUESS = {};

try {
  if (fs.existsSync(DATE_BASE_GUESS_PATH)) {
    DATE_BASE_GUESS = require(DATE_BASE_GUESS_PATH);
  } else {
    // Fallback to original path
    DATE_BASE_GUESS = require("./utillData/Dhanasree");
  }
} catch (error) {
  console.log('⚠️  Date base guess file not found, using empty data');
  DATE_BASE_GUESS = {};
}

// Matka name mapping
const MATKA_NAMES = {
  "SHRD": "SRIDEVI",
  "TB": "TIME BAZAR",
  "MLD": "MILAN DAY",
  "KL": "KALYAN",
  "SHRN": "SRIDEVI NIGHT",
  "MLN": "MILAN NIGHT",
  "MAIN": "MAIN BAZAR"
};

// Test historical accuracy
const testHistoricalAccuracy = (data, predictions, daysBack = 30) => {
  console.log('\n🧪 TESTING HISTORICAL ACCURACY...');
  
  const testData = data.slice(-daysBack);
  let correctPredictions = 0;
  let totalTests = 0;
  
  for (let i = 0; i < testData.length - 1; i++) {
    const today = testData[i];
    const tomorrow = testData[i + 1];
    
    const wasOpenPredicted = predictions.topJackpotPattis.includes(tomorrow.open);
    const wasClosePredicted = predictions.topJackpotPattis.includes(tomorrow.close);
    
    if (wasOpenPredicted || wasClosePredicted) {
      correctPredictions++;
    }
    totalTests++;
  }
  
  const accuracy = totalTests > 0 ? (correctPredictions / totalTests * 100).toFixed(1) : 0;
  console.log(`📊 Historical Accuracy (last ${daysBack} days): ${accuracy}% (${correctPredictions}/${totalTests} days)`);
  
  return accuracy;
};

// Main processing function
const processHTMLData = async (filePath, daysLimit = null) => {
  try {
    const result = await dataProcessor.processHTMLFile(filePath, daysLimit);
    const { data, analysis, fileName, recordsCount } = result;
    
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const customDateStr = `${dd}/${mm}/${yyyy}`;

    console.log(`📊 Analyzing ${recordsCount} records...`);
    
    const guesses = predictionEngine.generateGuesses(analysis, daysLimit || CONFIG.analysis.daysLimit);
    
    // Add historical accuracy test
    guesses.historicalAccuracy = testHistoricalAccuracy(data, guesses.jackpotPredictions, daysLimit || 30);
    
    // Generate risk assessment
    const riskAssessment = riskAssessor.calculateRiskMetrics(guesses.combinedPredictions, data);
    guesses.riskAssessment = riskAssessment;

    // Generate comprehensive report
    const report = visualization.generateAnalysisReport(guesses, analysis, fileName);

    // Display results
    displayResults(guesses, report, fileName, customDateStr, dd, data);

  } catch (err) {
    console.error('❌ Error processing file:', err.message);
  }
};

// Display results function
const displayResults = (guesses, report, fileName, customDateStr, dd, data) => {
  console.log('='.repeat(60));
  const mtk = fileName.split(".")[0];
  const matkaName = MATKA_NAMES[mtk] || mtk;
  
  console.log(`📊 ANALYSIS REPORT: ${matkaName}`);
  console.log(`📅 Data Range: ${customDateStr} (${data.length} days)`);
  console.log('='.repeat(60));
  
  // Date-based guesses
  console.log(`🔢 TODAY'S BEST GUESS BY DATE DHANLAXMI ${customDateStr}: ${DATE_BASE_GUESS[dd]?.join(", ") || "No guesses"}`);
  console.log(`🔢 Frequent Digits: ${guesses.frequentDigits.join(', ')}`);
  console.log(`📈 Top Open Sums: ${guesses.topOpenSums.join(', ')}`);
  console.log(`📉 Top Close Sums: ${guesses.topCloseSums.join(', ')}`);

  // Best ank to bet
  if (DATE_BASE_GUESS[dd]) {
    const base_array = DATE_BASE_GUESS[dd];
    const openAnk = guesses.topOpenSums.join(', ');
    const closeAnk = guesses.topCloseSums.join(', ');
    const arrays = [openAnk, closeAnk];
    const commonAny = base_array.filter(x => arrays.some(arr => arr.includes(x.toString())));
    console.log(`🔢 BEST ANK To BET: ${commonAny.join(", ") || "None"}`);
  }

  // Display families (only top 2 with 4 pattis each)
  if (guesses.topOpenFamilies.length > 0) {
    console.log('\n⭐ TOP OPEN ANK FAMILIES');
    guesses.topOpenFamilies.forEach(family => {
      console.log(`   Ank ${family.sum}: ${family.patti.join(', ')}`);
    });
  }

  if (guesses.topCloseFamilies.length > 0) {
    console.log('\n⭐ TOP CLOSE ANK FAMILIES');
    guesses.topCloseFamilies.forEach(family => {
      console.log(`   Ank ${family.sum}: ${family.patti.join(', ')}`);
    });
  }

  // Enhanced Jodi Display
  console.log(`\n🎯 ENHANCED JODI ANALYSIS:`);
  console.log(`   Top Jodis: ${guesses.topJodis.join(', ')}`);

  console.log(`\n💡 TOP 5 GUESS PATTIS: ${guesses.top5Guesses.join(', ')}`);
  
  // Display Optimized Panel Predictions
  visualization.displayPanelPredictions(guesses);
  
  // Risk Assessment
  console.log(`\n⚠️  RISK ASSESSMENT:`);
  console.log(`   Confidence: ${guesses.riskAssessment.confidenceInterval.average}%`);
  console.log(`   Risk Level: ${guesses.riskAssessment.riskLevel} (Score: ${guesses.riskAssessment.riskScore})`);
  console.log(`   Success Probability: ${guesses.riskAssessment.successProbability}%`);
  guesses.riskAssessment.recommendations.forEach(rec => {
    console.log(`   💡 ${rec}`);
  });
  
  // OPTIMIZED JACKPOT PREDICTIONS
  console.log(`\n` + '💰 OPTIMIZED JACKPOT PREDICTIONS '.padEnd(60, '💰'));
  visualization.displayJackpotPredictions(guesses.jackpotPredictions);
  
  console.log(`\n📈 PREDICTION ACCURACY: ${guesses.historicalAccuracy}%`);
  
  console.log('\n' + '='.repeat(60));
  console.log(`📅 Total Data Points Analyzed: ${data.length}`);
  console.log('='.repeat(60));
};

// Process multiple files
const processMultipleFiles = async (daysLimit = null) => {
  const files = [
    // './inputData/KL.html',
    './inputData/SHRD.html',
    // './inputData/TB.html',
    // './inputData/MLD.html',
    // './inputData/MLN.html',
    // './inputData/MAIN.html'
  ];

  const existingFiles = [];
  for (const file of files) {
    try {
      await fs.promises.access(file);
      existingFiles.push(file);
    } catch (err) {
      console.log(`⚠️  File not found: ${file}`);
    }
  }

  if (existingFiles.length === 0) {
    console.log('❌ No valid files found');
    return;
  }

  console.log(`\n🔄 Processing ${existingFiles.length} files...\n`);

  for (const file of existingFiles) {
    await processHTMLData(file, daysLimit);
    console.log('\n' + '═'.repeat(80) + '\n');
  }
};

// Main function
const main = async () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('🎰 MATKA DATA ANALYSIS TOOL (OPTIMIZED VERSION)');
  console.log('1. Last 15 days\n2. Last 30 days\n3. Last 45 days\n4. Last 60 days\n5. Last 90 days\n6. Last 365 days\n7. All data');
  
  rl.question('Enter choice (1-7): ', async (choice) => {
    const limits = { '1': 15, '2': 30, '3': 45, '4': 60, '5': 90, '6': 365, '7': null };
    const daysLimit = limits[choice] || null;
    
    rl.close();
    await processMultipleFiles(daysLimit);
  });
};

// Export for testing
module.exports = {
  processHTMLData,
  processMultipleFiles,
  testHistoricalAccuracy
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}