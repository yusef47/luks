#!/usr/bin/env node

/**
 * Simple test script to verify backend is working
 */

async function testBackend() {
  console.log('🧪 Testing Backend...\n');

  try {
    // Test 1: Health check
    console.log('1️⃣ Testing /api/health endpoint...');
    const healthRes = await fetch('http://localhost:5000/api/health');
    if (healthRes.ok) {
      const data = await healthRes.json();
      console.log('✅ Health check passed:', data);
    } else {
      console.error('❌ Health check failed:', healthRes.status);
    }

    // Test 2: Gemini status
    console.log('\n2️⃣ Testing /api/gemini/status endpoint...');
    const statusRes = await fetch('http://localhost:5000/api/gemini/status');
    if (statusRes.ok) {
      const data = await statusRes.json();
      console.log('✅ Gemini status:', data);
    } else {
      console.error('❌ Gemini status failed:', statusRes.status);
    }

    // Test 3: Tutor endpoint
    console.log('\n3️⃣ Testing /api/tutor/generate-response endpoint...');
    const tutorRes = await fetch('http://localhost:5000/api/tutor/generate-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        history: [],
        userMessage: 'Hello, how are you?',
        level: 'B1'
      })
    });
    
    if (tutorRes.ok) {
      const data = await tutorRes.json();
      console.log('✅ Tutor response received:', {
        success: data.success,
        dataLength: data.data?.length || 0
      });
    } else {
      const error = await tutorRes.text();
      console.error('❌ Tutor endpoint failed:', tutorRes.status, error);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n⚠️ Make sure backend is running on port 5000!');
    console.error('Run: npm run server:dev');
  }
}

testBackend();
