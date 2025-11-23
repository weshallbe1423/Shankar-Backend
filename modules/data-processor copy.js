const fs = require('fs');
const path = require('path');
const { calculateProbabilityDistribution } = require('../utils/helpers');

// Function to parse HTML
const parseData = (htmlData) => {
  const rows = htmlData.match(/<td\s*>\s*(\d+)\s*<\/td>/g) || [];
  const data = [];

  for (let i = 0; i < rows.length; i += 3) {
    const open = rows[i]?.replace(/<[^>]+>/g, '').trim();
    const jodi = rows[i + 1]?.replace(/<[^>]+>/g, '').trim();
    const close = rows[i + 2]?.replace(/<[^>]+>/g, '').trim();

    if (open && close && jodi && /^\d{3}$/.test(open) && /^\d{2}$/.test(jodi) && /^\d{3}$/.test(close)) {
      data.push({ open, jodi, close });
    }
  }
  return data;
};

// Analyze historical data
const analyzeData = (data) => {
  const digitFrequency = Array(10).fill(0);
  const openSumFrequency = Array(10).fill(0);
  const closeSumFrequency = Array(10).fill(0);
  const pattiFrequencyMap = {};

  data.forEach(day => {
    const openDigits = day.open.split('').map(Number);
    const closeDigits = day.close.split('').map(Number);

    // Digit frequency
    [...openDigits, ...closeDigits].forEach(d => {
      if (d >= 0 && d <= 9) digitFrequency[d]++;
    });

    // Sum frequency
    const openSum = openDigits.reduce((a, b) => a + b, 0) % 10;
    const closeSum = closeDigits.reduce((a, b) => a + b, 0) % 10;
    if (openSum >= 0 && openSum <= 9) openSumFrequency[openSum]++;
    if (closeSum >= 0 && closeSum <= 9) closeSumFrequency[closeSum]++;

    // Patti frequency
    [day.open, day.close].forEach(patti => {
      pattiFrequencyMap[patti] = (pattiFrequencyMap[patti] || 0) + 1;
    });
  });

  const probabilityDistribution = calculateProbabilityDistribution(data);

  return { 
    digitFrequency, 
    openSumFrequency, 
    closeSumFrequency, 
    pattiFrequencyMap,
    probabilityDistribution,
    data
  };
};

// Process HTML file
const processHTMLFile = async (filePath, daysLimit = null) => {
  try {
    const htmlData = await fs.promises.readFile(filePath, 'utf-8');
    let data = parseData(htmlData);
    
    if (data.length === 0) {
      throw new Error('No valid data found in file');
    }

    if (daysLimit && daysLimit > 0) {
      data = data.slice(-daysLimit);
    }
    
    const analysis = analyzeData(data);
    
    return {
      data,
      analysis,
      fileName: path.basename(filePath),
      recordsCount: data.length
    };
  } catch (error) {
    throw new Error(`Error processing file ${filePath}: ${error.message}`);
  }
};

module.exports = {
  parseData,
  analyzeData,
  processHTMLFile
};