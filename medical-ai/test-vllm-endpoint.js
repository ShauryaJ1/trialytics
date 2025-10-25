// Simple test script to verify VLLM endpoint connectivity
// Run with: node test-vllm-endpoint.js

const endpoint = 'http://98.88.218.185:8000/v1/completions';

async function testCompletion() {
  console.log('Testing VLLM endpoint:', endpoint);
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'Qwen/Qwen3-8B',
        prompt: 'San Francisco is a',
        max_tokens: 50,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Success! Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nMake sure the VLLM server is running and accessible.');
  }
}

async function testChatCompletion() {
  const chatEndpoint = 'http://98.88.218.185:8000/v1/chat/completions';
  console.log('\nTesting chat completions endpoint:', chatEndpoint);
  
  try {
    const response = await fetch(chatEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'Qwen/Qwen3-8B',
        messages: [
          {
            role: 'user',
            content: 'Hello! How are you?',
          },
        ],
        max_tokens: 50,
        temperature: 0.7,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Chat completion success! Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Chat completion error:', error.message);
  }
}

// Run tests
testCompletion().then(() => testChatCompletion());
