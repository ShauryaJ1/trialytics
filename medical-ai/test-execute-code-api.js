/**
 * Test script for the execute-code API endpoint
 * This demonstrates how to use the code execution tool via the AI agent
 */

const API_BASE_URL = 'http://localhost:3000/api/execute-code';

// Test examples
const testPrompts = [
  {
    name: "Basic Python execution",
    prompt: "Execute Python code to print 'Hello World' and the current date/time",
  },
  {
    name: "NumPy calculation",
    prompt: "Write and execute Python code to create a 3x3 random matrix with NumPy and calculate its eigenvalues",
  },
  {
    name: "Data analysis with Pandas",
    prompt: "Create a pandas DataFrame with sample student grades data (at least 10 rows) and calculate the average grade per subject",
  },
  {
    name: "Error handling test",
    prompt: "Execute Python code that intentionally raises a ZeroDivisionError to test error handling",
  },
  {
    name: "Web request",
    prompt: "Write Python code to fetch data from https://httpbin.org/json and display the response",
  }
];

// Check server health
async function checkServerHealth() {
  console.log('Checking Modal server health...\n');
  
  try {
    const response = await fetch(API_BASE_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    const data = await response.json();
    console.log('Server Status:', data.available ? '✅ Available' : '❌ Unavailable');
    if (data.modalServerUrl) {
      console.log('Modal Server URL:', data.modalServerUrl);
    }
    if (data.health) {
      console.log('Health Details:', JSON.stringify(data.health, null, 2));
    }
    if (data.error) {
      console.log('Error:', data.error);
    }
    console.log('\n' + '='.repeat(50) + '\n');
    
    return data.available;
  } catch (error) {
    console.error('Failed to check server health:', error.message);
    return false;
  }
}

// Execute a single test
async function executeTest(testCase) {
  console.log(`Test: ${testCase.name}`);
  console.log(`Prompt: ${testCase.prompt}`);
  console.log('-'.repeat(50));
  
  try {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: testCase.prompt,
        includeExamples: false,
      }),
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error('❌ Error:', data.error);
    } else {
      // Display AI response
      if (data.text) {
        console.log('\n📝 AI Response:');
        console.log(data.text);
      }
      
      // Display tool calls
      if (data.toolCalls && data.toolCalls.length > 0) {
        console.log('\n🔧 Tool Calls:');
        data.toolCalls.forEach((call, index) => {
          console.log(`  ${index + 1}. ${call.toolName}`);
          if (call.args.code) {
            console.log(`     Code length: ${call.args.code.length} characters`);
            // Show first 100 chars of code
            const preview = call.args.code.substring(0, 100);
            console.log(`     Code preview: ${preview}${call.args.code.length > 100 ? '...' : ''}`);
          }
        });
      }
      
      // Display execution results
      if (data.toolResults && data.toolResults.length > 0) {
        console.log('\n📊 Execution Results:');
        data.toolResults.forEach((result) => {
          if (result.toolName === 'executeCode') {
            const execResult = result.result;
            if (execResult.success) {
              console.log('  ✅ Execution successful');
              if (execResult.output) {
                console.log('  Output:');
                console.log('  ', execResult.output.split('\n').join('\n  '));
              }
              if (execResult.execution_time) {
                console.log(`  Execution time: ${execResult.execution_time.toFixed(2)}s`);
              }
            } else {
              console.log('  ❌ Execution failed');
              if (execResult.error) {
                console.log('  Error:', execResult.error);
              }
            }
          } else {
            console.log(`  Tool: ${result.toolName}`);
            console.log('  Result:', JSON.stringify(result.result, null, 2));
          }
        });
      }
      
      // Display token usage
      if (data.usage) {
        console.log('\n📈 Token Usage:');
        console.log(`  Prompt: ${data.usage.promptTokens}`);
        console.log(`  Completion: ${data.usage.completionTokens}`);
        console.log(`  Total: ${data.usage.totalTokens}`);
      }
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
}

// Run all tests
async function runTests() {
  console.log('🚀 Testing Execute Code API Endpoint');
  console.log('='.repeat(50) + '\n');
  
  // First check if the server is available
  const serverAvailable = await checkServerHealth();
  
  if (!serverAvailable) {
    console.log('⚠️  Warning: Modal server appears to be unavailable.');
    console.log('The tests will still run but code execution may fail.\n');
  }
  
  // Run each test with a delay
  for (const testCase of testPrompts) {
    await executeTest(testCase);
    // Wait 2 seconds between tests to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('✅ All tests completed!\n');
  
  // Print usage instructions
  console.log('📚 How to use this API in your application:\n');
  console.log('1. Send a POST request to /api/execute-code with a prompt');
  console.log('2. The AI will generate and execute Python code based on your prompt');
  console.log('3. You\'ll receive the AI response, tool calls, and execution results\n');
  console.log('Example fetch request:');
  console.log(`
fetch('/api/execute-code', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Calculate the factorial of 10',
    includeExamples: false
  })
});
`);
}

// Run the tests
runTests().catch(console.error);
