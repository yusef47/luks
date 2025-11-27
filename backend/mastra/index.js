/**
 * Mastra Instance - النسخة الرئيسية
 * هنا يتم تجميع كل الـ Agents والـ Workflows
 */

const { Mastra } = require('mastra');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

// Import Agents
const SearchAgent = require('../agents/SearchAgent');
const MapsAgent = require('../agents/MapsAgent');
const VisionAgent = require('../agents/VisionAgent');
const VideoAgent = require('../agents/VideoAgent');
const ImageGenerationAgent = require('../agents/ImageGenerationAgent');
const EmailAgent = require('../agents/EmailAgent');
const SheetsAgent = require('../agents/SheetsAgent');
const DriveAgent = require('../agents/DriveAgent');
const EnglishTutorAgent = require('../agents/EnglishTutorAgent');
const OrchestratorAgent = require('../agents/OrchestratorAgent');

// Import Workflows
const orchestratorFlow = require('../workflows/orchestratorFlow');
const englishTutorFlow = require('../workflows/englishTutorFlow');
const searchFlow = require('../workflows/searchFlow');

// Initialize Mastra
const mastra = new Mastra({
  name: 'Lukas',
  description: 'Lukas AI Orchestrator - Your Intelligent Assistant',
  
  // All Agents
  agents: {
    search: SearchAgent,
    maps: MapsAgent,
    vision: VisionAgent,
    video: VideoAgent,
    imageGeneration: ImageGenerationAgent,
    email: EmailAgent,
    sheets: SheetsAgent,
    drive: DriveAgent,
    englishTutor: EnglishTutorAgent,
    orchestrator: OrchestratorAgent
  },
  
  // All Workflows
  workflows: {
    orchestrator: orchestratorFlow,
    englishTutor: englishTutorFlow,
    search: searchFlow
  },
  
  // Configuration
  config: {
    logging: true,
    errorHandling: 'graceful'
  }
});

// Helper to get AI instance
const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error('No API key found');
  }
  return new GoogleGenAI({ apiKey });
};

module.exports = { mastra, getAI };
