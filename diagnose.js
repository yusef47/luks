#!/usr/bin/env node

/**
 * Diagnostic script to find the issue
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('\n🔍 DIAGNOSTIC REPORT\n');

// Check 1: API Keys
console.log('1️⃣ API Keys Check:');
const keys = [
  'VITE_GEMINI_API_KEY_1',
  'VITE_GEMINI_API_KEY_2',
  'VITE_GEMINI_API_KEY_3',
  'GEMINI_API_KEY_1',
  'GEMINI_API_KEY_2',
  'GEMINI_API_KEY_3',
];

let keyCount = 0;
keys.forEach(key => {
  const value = process.env[key];
  if (value) {
    console.log(`   ✅ ${key}: ${value.substring(0, 10)}...`);
    keyCount++;
  }
});

if (keyCount === 0) {
  console.log('   ❌ NO API KEYS FOUND!');
} else {
  console.log(`   ✅ Found ${keyCount} API keys`);
}

// Check 2: Server config
console.log('\n2️⃣ Server Config:');
console.log(`   PORT: ${process.env.PORT || 5000}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

// Check 3: Frontend config
console.log('\n3️⃣ Frontend Config:');
console.log(`   VITE_BACKEND_URL: ${process.env.VITE_BACKEND_URL || 'http://localhost:5000/api'}`);

// Check 4: Test API call
console.log('\n4️⃣ Testing API Call:');

try {
  const { GoogleGenAI } = await import('@google/genai');
  
  const key = process.env.VITE_GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY_1;
  
  if (!key) {
    console.log('   ❌ No API key available for testing');
  } else {
    console.log('   🔐 Initializing Gemini...');
    const ai = new GoogleGenAI({ apiKey: key });
    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash-lite-preview-02-05' });
    
    console.log('   📝 Sending test prompt...');
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: 'Say hello' }] }]
    });
    
    const response = result.response.text();
    console.log(`   ✅ Got response: ${response.substring(0, 50)}...`);
  }
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}

console.log('\n✅ Diagnostic complete!\n');
