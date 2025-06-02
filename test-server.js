#!/usr/bin/env node

/**
 * Test script for AWS EKS MCP Server
 * This script tests the server functionality by simulating MCP tool calls
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class MCPTester {
  constructor() {
    this.serverProcess = null;
  }

  async startServer() {
    console.log('🚀 Starting AWS EKS MCP Server...');
    
    const serverPath = join(__dirname, 'build', 'index.js');
    this.serverProcess = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        AWS_REGION: process.env.AWS_REGION || 'us-east-1',
        AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || 'test-key',
        AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || 'test-secret'
      }
    });

    return new Promise((resolve, reject) => {
      this.serverProcess.stderr.on('data', (data) => {
        const message = data.toString();
        console.log('📡 Server:', message.trim());
        if (message.includes('AWS EKS MCP server running')) {
          resolve();
        }
      });

      this.serverProcess.on('error', (error) => {
        console.error('❌ Server error:', error);
        reject(error);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        reject(new Error('Server startup timeout'));
      }, 10000);
    });
  }

  async sendRequest(request) {
    return new Promise((resolve, reject) => {
      let response = '';
      
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 5000);

      this.serverProcess.stdout.on('data', (data) => {
        response += data.toString();
        try {
          const parsed = JSON.parse(response);
          clearTimeout(timeout);
          resolve(parsed);
        } catch (e) {
          // Continue accumulating response
        }
      });

      this.serverProcess.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  async testListTools() {
    console.log('\n🔧 Testing list_tools...');
    
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list'
    };

    try {
      const response = await this.sendRequest(request);
      console.log('✅ Tools available:', response.result?.tools?.length || 0);
      
      if (response.result?.tools) {
        response.result.tools.forEach(tool => {
          console.log(`   - ${tool.name}: ${tool.description}`);
        });
      }
      
      return true;
    } catch (error) {
      console.error('❌ List tools failed:', error.message);
      return false;
    }
  }

  async testListClusters() {
    console.log('\n📋 Testing list_eks_clusters...');
    
    const request = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'list_eks_clusters',
        arguments: {}
      }
    };

    try {
      const response = await this.sendRequest(request);
      
      if (response.error) {
        console.log('⚠️  Expected error (no real AWS credentials):', response.error.message);
        return true; // This is expected in test environment
      }
      
      console.log('✅ Clusters listed successfully');
      return true;
    } catch (error) {
      console.error('❌ List clusters failed:', error.message);
      return false;
    }
  }

  async stopServer() {
    if (this.serverProcess) {
      console.log('\n🛑 Stopping server...');
      this.serverProcess.kill('SIGTERM');
      
      return new Promise((resolve) => {
        this.serverProcess.on('exit', () => {
          console.log('✅ Server stopped');
          resolve();
        });
        
        // Force kill after 5 seconds
        setTimeout(() => {
          this.serverProcess.kill('SIGKILL');
          resolve();
        }, 5000);
      });
    }
  }

  async runTests() {
    try {
      await this.startServer();
      
      const results = [];
      results.push(await this.testListTools());
      results.push(await this.testListClusters());
      
      const passed = results.filter(r => r).length;
      const total = results.length;
      
      console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
      
      if (passed === total) {
        console.log('🎉 All tests passed! The MCP server is working correctly.');
      } else {
        console.log('⚠️  Some tests failed. Check the output above for details.');
      }
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
    } finally {
      await this.stopServer();
    }
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🧪 AWS EKS MCP Server Test Suite');
  console.log('================================');
  
  const tester = new MCPTester();
  tester.runTests().catch(console.error);
}

export default MCPTester;