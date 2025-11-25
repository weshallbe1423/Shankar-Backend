const express = require('express');
const fs = require('fs');
const path = require('path');

// Import your analysis modules
const dataProcessor = require('../modules/data-processor');
const predictionEngine = require('../modules/prediction-engine');
const riskAssessor = require('../modules/risk-assessor');

const router = express.Router();

// Get available matka list
router.get('/game-list', (req, res) => {
  try {
    const matkaList = [
      { id: 'SHRD', name: 'SRIDEVI', file: 'SHRD.html', description: 'Sridevi Matka' },
      { id: 'MADHURI', name: 'MADHURI', file: 'MADHURI.html', description: 'Madhuri' },
      { id: 'TB', name: 'TIME BAZAR', file: 'TB.html', description: 'Time Bazar' },
      { id: 'MLD', name: 'MILAN DAY', file: 'MLD.html', description: 'Milan Day' },
      { id: 'PUNA', name: 'PUNA BAZAR', file: 'PUNA.html', description: 'Puna Bazar' },
      { id: 'KL', name: 'KALYAN', file: 'KL.html', description: 'Kalyan Matka' },
      { id: 'SHRN', name: 'SRIDEVI NIGHT', file: 'SHRN.html', description: 'Sridevi Night' },
      { id: 'MLN', name: 'MILAN NIGHT', file: 'MLN.html', description: 'Milan Night' },
      { id: 'RJD', name: 'RAJDHANI DAY', file: 'RJD.html', description: 'Rajdhani Day' },
      { id: 'MAIN', name: 'MAIN BAZAR', file: 'MAIN.html', description: 'Main Bazar' },
      { id: 'RJN', name: 'RAJDHANI NIGHT', file: 'RJN.html', description: 'Rajdhani Night' },
      { id: 'MADHURI NIGHT', name: 'MADHURI NIGHT', file: 'MDHN.html', description: 'Madhuri Night' }

    ];

    // Check which files actually exist
    const availableMatkas = matkaList.filter(matka => {
      const filePath = path.join(__dirname, '../inputData', matka.file);
      return fs.existsSync(filePath);
    });

    res.json({
      success: true,
      data: availableMatkas,
      count: availableMatkas.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to load matka list',
      message: error.message
    });
  }
});

// Analyze specific matka
router.post('/analyze', async (req, res) => {
  try {
    const { matkaId, daysLimit = 30 } = req.body;

    // Validate input
    if (!matkaId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field',
        message: 'matkaId is required'
      });
    }

    const matkaFiles = {
      'KL': './inputData/KL.html',
      'SHRD': './inputData/SHRD.html',
      'TB': './inputData/TB.html',
      'MLD': './inputData/MLD.html',
      'MLN': './inputData/MLN.html',
      'MAIN': './inputData/MAIN.html',
      'MADHURI': './inputData/MADHURI.html',
      'PUNA': './inputData/PUNA.html',
      'SHRN': './inputData/SHRN.html',
      'RJD': './inputData/RJD.html',
      'RJN': './inputData/RJN.html',
      'MADHURI NIGHT': './inputData/MDHN.html'
    };

    const relativePath = matkaFiles[matkaId];
    if (!relativePath) {
      return res.status(404).json({
        success: false,
        error: 'Matka not found',
        message: `Matka with ID '${matkaId}' is not supported`
      });
    }

    const filePath = path.join(__dirname, '..', relativePath);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Data file not found',
        message: `Data file for ${matkaId} not found at ${filePath}`
      });
    }

    console.log(`🔮 Analyzing ${matkaId} for ${daysLimit} days...`);

    // Process the data using your existing code
    const result = await dataProcessor.processHTMLFile(filePath, daysLimit);
    const { data, analysis } = result;
    
    // Generate predictions
    const guesses = predictionEngine.generateGuesses(analysis, daysLimit);
    
    // Add risk assessment
    const riskAssessment = riskAssessor.calculateRiskMetrics(guesses.combinedPredictions, data);
    guesses.riskAssessment = riskAssessment;

    // Calculate historical accuracy
    const historicalAccuracy = calculateHistoricalAccuracy(data, guesses.jackpotPredictions, daysLimit || 30);
    guesses.historicalAccuracy = historicalAccuracy;

    // Format response
    const response = {
      success: true,
      data: {
        matkaId,
        matkaName: matkaId,
        analysisDate: new Date().toISOString(),
        dataPoints: data.length,
        daysLimit: daysLimit,
        predictions: guesses,
        summary: {
          frequentDigits: guesses.frequentDigits,
          topOpenSums: guesses.topOpenSums,
          topCloseSums: guesses.topCloseSums,
          historicalAccuracy: historicalAccuracy
        },
        metadata: {
          processingTime: Date.now() - req.startTime,
          algorithmVersion: '2.0.0'
        }
      }
    };

    console.log(`✅ Analysis completed for ${matkaId}: ${data.length} records processed`);
    
    res.json(response);
  } catch (error) {
    console.error('❌ Analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Analysis failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get date-based guesses
router.get('/date-guesses', (req, res) => {
  try {
    // Try multiple possible paths for the date guesses file
    const possiblePaths = [
      '..',
    ];

    let DATE_BASE_GUESS = {};
    let loadedPath = '';

    for (const possiblePath of possiblePaths) {
      const fullPath = path.join(__dirname, '..', possiblePath);
      try {
        // Try .json first
        const jsonPath = fullPath.endsWith('.json') ? fullPath : fullPath + '.json';
        if (fs.existsSync(jsonPath)) {
          DATE_BASE_GUESS = require(jsonPath);
          loadedPath = jsonPath;
          break;
        }
        // Try .js
        const jsPath = fullPath.endsWith('.js') ? fullPath : fullPath + '.js';
        if (fs.existsSync(jsPath)) {
          DATE_BASE_GUESS = require(jsPath);
          loadedPath = jsPath;
          break;
        }
        // Try without extension
        if (fs.existsSync(fullPath)) {
          DATE_BASE_GUESS = require(fullPath);
          loadedPath = fullPath;
          break;
        }
      } catch (e) {
        // Continue to next path
        continue;
      }
    }

    // Fallback to default data if file not found
    if (Object.keys(DATE_BASE_GUESS).length === 0) {
      DATE_BASE_GUESS = generateDefaultDateGuesses();
      loadedPath = 'default';
      console.log('⚠️ Using default date guesses');
    }

    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    
    const guesses = DATE_BASE_GUESS[dd] || ["3", "7", "8", "1", "5"];

    res.json({
      success: true,
      data: {
        date: `${dd}/${mm}/${yyyy}`,
        guesses: guesses,
        source: loadedPath,
        count: guesses.length
      }
    });
  } catch (error) {
    console.error('Date guesses error:', error);
    res.json({
      success: true,
      data: {
        date: new Date().toLocaleDateString(),
        guesses: ["3", "7", "8", "1", "5"],
        source: 'fallback',
        count: 5
      }
    });
  }
});

// Batch analyze multiple matkas
router.post('/batch-analyze', async (req, res) => {
  try {
    const { matkaIds, daysLimit = 30 } = req.body;

    if (!matkaIds || !Array.isArray(matkaIds)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        message: 'matkaIds must be an array'
      });
    }

    const results = [];
    const errors = [];

    for (const matkaId of matkaIds) {
      try {
        const matkaFiles = {
          'KL': './inputData/KL.html',
          'SHRD': './inputData/SHRD.html',
          'TB': './inputData/TB.html',
          'MLD': './inputData/MLD.html',
          'MLN': './inputData/MLN.html',
          'MAIN': './inputData/MAIN.html',
          'MADHURI': './inputData/MADHURI.html',
          'PUNA': './inputData/PUNA.html',
          'SHRN': './inputData/SHRN.html',
          'RJD': './inputData/RJD.html',
          'RJN': './inputData/RJN.html',
          'MADHURI NIGHT': './inputData/MDHN.html'
        };

        const relativePath = matkaFiles[matkaId];
        if (!relativePath) {
          errors.push({ matkaId, error: 'Matka not supported' });
          continue;
        }

        const filePath = path.join(__dirname, '..', relativePath);
        
        if (!fs.existsSync(filePath)) {
          errors.push({ matkaId, error: 'Data file not found' });
          continue;
        }

        const result = await dataProcessor.processHTMLFile(filePath, daysLimit);
        const guesses = predictionEngine.generateGuesses(result.analysis, daysLimit);
        
        results.push({
          matkaId,
          matkaName: matkaId,
          dataPoints: result.data.length,
          predictions: {
            topJodis: guesses.topJodis,
            top5Guesses: guesses.top5Guesses,
            historicalAccuracy: calculateHistoricalAccuracy(result.data, guesses.jackpotPredictions, daysLimit)
          }
        });
      } catch (error) {
        errors.push({ matkaId, error: error.message });
      }
    }

    res.json({
      success: true,
      data: {
        results,
        errors,
        totalProcessed: results.length,
        totalErrors: errors.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Batch analysis failed',
      message: error.message
    });
  }
});

// Append raw data string to matka file
router.post('/append-raw-data', async (req, res) => {
  try {
    const { matkaId, rawData } = req.body;

    // Validate input
    if (!matkaId || !rawData) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'matkaId and rawData are required'
      });
    }

    // Validate rawData is a string
    if (typeof rawData !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid data format',
        message: 'rawData must be a string'
      });
    }

    const matkaFiles = {
       'KL': './inputData/KL.html',
      'SHRD': './inputData/SHRD.html',
      'TB': './inputData/TB.html',
      'MLD': './inputData/MLD.html',
      'MLN': './inputData/MLN.html',
      'MAIN': './inputData/MAIN.html',
      'MADHURI': './inputData/MADHURI.html',
      'PUNA': './inputData/PUNA.html',
      'SHRN': './inputData/SHRN.html',
      'RJD': './inputData/RJD.html',
      'RJN': './inputData/RJN.html',
      'MADHURI NIGHT': './inputData/MDHN.html'
    };

    const relativePath = matkaFiles[matkaId];
    if (!relativePath) {
      return res.status(404).json({
        success: false,
        error: 'Matka not found',
        message: `Matka with ID '${matkaId}' is not supported`
      });
    }

    const filePath = path.join(__dirname, '..', relativePath);
    
    // Read existing file or start fresh
    let existingContent = '';
    if (fs.existsSync(filePath)) {
      existingContent = await fs.promises.readFile(filePath, 'utf-8');
      
      // Add newline if file doesn't end with one
      if (!existingContent.endsWith('\n') && existingContent.length > 0) {
        existingContent += '\n';
      }
    }

    // Simply append the raw data string
    const newContent = existingContent + rawData;

    // Write the updated content back to file
    await fs.promises.writeFile(filePath, newContent, 'utf-8');

    console.log(`✅ Appended raw data to ${matkaId}`);
    console.log(`Data appended:\n${rawData}`);

    res.json({
      success: true,
      message: 'Data appended successfully',
      data: {
        matkaId,
        charactersAppended: rawData.length,
        filePath: relativePath
      }
    });
  } catch (error) {
    console.error('❌ Error appending raw data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to append data',
      message: error.message
    });
  }
});

// Get file info
router.get('/file-info/:matkaId', async (req, res) => {
  try {
    const { matkaId } = req.params;

    const matkaFiles = {
      'KL': './inputData/KL.html',
      'SHRD': './inputData/SHRD.html',
      'TB': './inputData/TB.html',
      'MLD': './inputData/MLD.html',
      'MLN': './inputData/MLN.html',
      'MAIN': './inputData/MAIN.html',
      'MADHURI': './inputData/MADHURI.html',
      'PUNA': './inputData/PUNA.html',
      'SHRN': './inputData/SHRN.html',
      'RJD': './inputData/RJD.html',
      'RJN': './inputData/RJN.html',
      'MADHURI NIGHT': './inputData/MDHN.html'
    };

    const relativePath = matkaFiles[matkaId];
    if (!relativePath) {
      return res.status(404).json({
        success: false,
        error: 'Matka not found'
      });
    }

    const filePath = path.join(__dirname, '..', relativePath);
    
    if (!fs.existsSync(filePath)) {
      return res.json({
        success: true,
        data: {
          matkaId,
          exists: false,
          size: 0,
          lineCount: 0,
          message: 'File does not exist'
        }
      });
    }

    const stats = fs.statSync(filePath);
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const lineCount = content.split('\n').length;

    res.json({
      success: true,
      data: {
        matkaId,
        exists: true,
        size: stats.size,
        lineCount,
        lastModified: stats.mtime
      }
    });
  } catch (error) {
    console.error('Error getting file info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get file info',
      message: error.message
    });
  }
});
// Helper function to calculate historical accuracy
function calculateHistoricalAccuracy(data, predictions, daysBack = 30) {
  const testData = data.slice(-daysBack);
  let correctPredictions = 0;
  let totalTests = 0;
  
  for (let i = 0; i < testData.length - 1; i++) {
    const tomorrow = testData[i + 1];
    const wasOpenPredicted = predictions.topJackpotPattis.includes(tomorrow.open);
    const wasClosePredicted = predictions.topJackpotPattis.includes(tomorrow.close);
    if (wasOpenPredicted || wasClosePredicted) correctPredictions++;
    totalTests++;
  }
  
  return totalTests > 0 ? (correctPredictions / totalTests * 100).toFixed(1) : 0;
}

// Helper function for default date guesses
function generateDefaultDateGuesses() {
  const guesses = {};
  for (let i = 1; i <= 31; i++) {
    const day = i.toString().padStart(2, '0');
    // Simple algorithm for default guesses
    const base = [(i % 9) + 1, ((i * 2) % 9) + 1, ((i * 3) % 9) + 1];
    guesses[day] = [...new Set(base)].map(n => n.toString());
  }
  return guesses;
}

// Add timing middleware for this route
router.use('/analyze', (req, res, next) => {
  req.startTime = Date.now();
  next();
});

module.exports = router;