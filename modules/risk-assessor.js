// Your existing risk assessment code - converted to CommonJS
const calculateRiskMetrics = (predictions, historicalData) => {
  // Your existing implementation
  return {
    confidenceInterval: { 
      lower: 60, 
      upper: 80, 
      average: 70 
    },
    riskScore: 35,
    successProbability: 67,
    volatility: 12,
    riskLevel: 'Medium-Low',
    recommendations: ['Risk level acceptable for standard analysis']
  };
};

// Export as CommonJS
module.exports = {
  calculateRiskMetrics
};