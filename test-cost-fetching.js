// Test script for cost fetching debugging
// Run this in browser console to test the API

async function testCostFetching() {
  console.log('🔍 Testing Cost Fetching...');
  
  try {
    // Test 1: Check if backend is running
    console.log('1. Testing backend connection...');
    const statusResponse = await fetch('/api/shopify/status');
    console.log('Backend status:', statusResponse.status);
    
    if (!statusResponse.ok) {
      throw new Error('Backend not responding');
    }
    
    // Test 2: Check store connection
    console.log('2. Testing store connection...');
    const connectionResponse = await fetch('/api/shopify/connection-status');
    const connectionData = await connectionResponse.json();
    console.log('Store connection:', connectionData);
    
    if (!connectionData.success) {
      throw new Error('No store connected: ' + connectionData.error);
    }
    
    // Test 3: Try to start cost fetching
    console.log('3. Testing cost fetching...');
    const costResponse = await fetch('/api/shopify/costs/fetch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const costData = await costResponse.json();
    console.log('Cost fetching response:', costData);
    
    if (costData.success) {
      console.log('✅ Cost fetching started successfully!');
      console.log('Job ID:', costData.data.jobId);
      console.log('Total variants:', costData.data.totalVariants);
      
      // Test 4: Check progress
      console.log('4. Testing progress...');
      setTimeout(async () => {
        const progressResponse = await fetch(`/api/shopify/costs/progress/${costData.data.jobId}`);
        const progressData = await progressResponse.json();
        console.log('Progress:', progressData);
      }, 2000);
      
    } else {
      console.error('❌ Cost fetching failed:', costData.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('Full error:', error);
  }
}

// Run the test
testCostFetching(); 