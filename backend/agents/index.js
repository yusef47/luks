/**
 * Backend Agents - تصدير جميع الوكلاء
 * جميع الوكلاء مع Mastra Framework
 */

module.exports = {
  // Core Agents
  SearchAgent: require('./SearchAgent'),
  VisionAgent: require('./VisionAgent'),
  MapsAgent: require('./MapsAgent'),
  VideoAgent: require('./VideoAgent'),
  ImageGenerationAgent: require('./ImageGenerationAgent'),
  
  // Productivity Agents
  EmailAgent: require('./EmailAgent'),
  SheetsAgent: require('./SheetsAgent'),
  DriveAgent: require('./DriveAgent'),
  
  // Special Agents
  EnglishTutorAgent: require('./EnglishTutorAgent'),
  OrchestratorAgent: require('./OrchestratorAgent')
};
