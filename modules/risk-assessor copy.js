const { CONFIG } = require('../config/constants');

// Calculate risk metrics for predictions
const calculateRiskMetrics = (predictions, historicalData) => {
  const confidence = calculateConfidence(predictions);
  const riskScore = assessRiskLevel(predictions);
  const successProbability = calculateSuccessRate(predictions, historicalData);
  const volatility = measureVolatility(predictions);
  
  return {
    confidenceInterval: confidence,
    riskScore,
    successProbability,
    volatility,
    riskLevel: getRiskLevel(riskScore),
    recommendations: generateRiskRecommendations(riskScore, confidence)
  };
};

const calculateConfidence = (predictions) => {
  if (!predictions.panelJodis || predictions.panelJodis.length === 0) {
    return { lower: 0, upper: 0, average: 0 };
  }
  
  const scores = predictions.panelJodis.map(j => j.score);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const maxScore = Math.max(...scores);
  
  return {
    lower: Math.round((avgScore / maxScore) * 50),
    upper: Math.round((avgScore / maxScore) * 85),
    average: Math.round((avgScore / maxScore) * 100)
  };
};

const assessRiskLevel = (predictions) => {
  let riskScore = 50; // Base medium risk
  
  // Adjust based on prediction consistency
  if (predictions.panelJodis) {
    const topScores = predictions.panelJodis.slice(0, 3).map(j => j.score);
    const scoreVariation = Math.max(...topScores) - Math.min(...topScores);
    
    if (scoreVariation > 50) riskScore += 20; // High variation = higher risk
    if (scoreVariation < 20) riskScore -= 15; // Low variation = lower risk
  }
  
  return Math.max(0, Math.min(100, riskScore));
};

const calculateSuccessRate = (predictions, historicalData) => {
  // Simplified success rate calculation
  // In practice, this would use backtesting
  const recentData = historicalData.slice(-30);
  let successfulPredictions = 0;
  
  // This is a simplified version - actual implementation would be more complex
  predictions.panelJodis?.forEach(jodi => {
    if (recentData.some(day => day.jodi === jodi.jodi)) {
      successfulPredictions++;
    }
  });
  
  const rate = predictions.panelJodis ? 
    (successfulPredictions / predictions.panelJodis.length) * 100 : 0;
  
  return Math.round(rate);
};

const measureVolatility = (predictions) => {
  if (!predictions.panelJodis || predictions.panelJodis.length < 2) {
    return 0;
  }
  
  const scores = predictions.panelJodis.map(j => j.score);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
  
  return Math.round(Math.sqrt(variance));
};

const getRiskLevel = (riskScore) => {
  if (riskScore <= 25) return 'Low';
  if (riskScore <= 50) return 'Medium-Low';
  if (riskScore <= 75) return 'Medium-High';
  return 'High';
};

const generateRiskRecommendations = (riskScore, confidence) => {
  const recommendations = [];
  
  if (riskScore > 70) {
    recommendations.push('Consider reducing position size due to high risk');
    recommendations.push('Wait for more consistent patterns to emerge');
  }
  
  if (confidence.average < 60) {
    recommendations.push('Low confidence level - verify with additional analysis');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Risk level acceptable for standard analysis');
  }
  
  return recommendations;
};

// Validate prediction quality
const validatePrediction = (prediction, historicalData) => {
  const errors = [];
  const warnings = [];
  
  // Check for overfitting
  if (isOverfitted(prediction, historicalData)) {
    errors.push('Model may be overfitted to historical data');
  }
  
  // Check confidence levels
  if (prediction.confidence < CONFIG.analysis.confidenceThreshold * 100) {
    warnings.push('Low confidence prediction - consider additional verification');
  }
  
  // Check data sufficiency
  if (historicalData.length < CONFIG.validation.minimumDataPoints) {
    warnings.push(`Limited historical data (${historicalData.length} points)`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions: generateImprovementSuggestions(prediction)
  };
};

const isOverfitted = (prediction, historicalData) => {
  // Simplified overfitting detection
  // In practice, this would use cross-validation
  const recentPerformance = calculateSuccessRate(prediction, historicalData.slice(-30));
  const overallPerformance = calculateSuccessRate(prediction, historicalData);
  
  return recentPerformance > overallPerformance * 1.5; // Significant performance difference may indicate overfitting
};

const generateImprovementSuggestions = (prediction) => {
  const suggestions = [];
  
  if (prediction.riskScore > 70) {
    suggestions.push('Increase analysis window size for more stable patterns');
    suggestions.push('Incorporate additional validation methods');
  }
  
  if (prediction.confidence < 60) {
    suggestions.push('Expand pattern recognition parameters');
    suggestions.push('Include more historical data in analysis');
  }
  
  return suggestions.length > 0 ? suggestions : ['Current analysis parameters appear optimal'];
};

module.exports = {
  calculateRiskMetrics,
  validatePrediction,
  calculateConfidence,
  assessRiskLevel
};