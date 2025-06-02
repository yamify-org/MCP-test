#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { EKSManager } from './eksManager.js';
import { K8sClient } from './k8sClient.js';
import { CreateClusterRequest } from './types.js';

// Validation functions
const isValidCreateClusterArgs = (args: any): args is CreateClusterRequest => {
  return (
    typeof args === 'object' &&
    args !== null &&
    typeof args.clusterName === 'string' &&
    typeof args.region === 'string' &&
    typeof args.kubernetesVersion === 'string' &&
    typeof args.roleArn === 'string' &&
    Array.isArray(args.subnetIds) &&
    args.subnetIds.every((id: any) => typeof id === 'string') &&
    (args.securityGroupIds === undefined || 
     (Array.isArray(args.securityGroupIds) && 
      args.securityGroupIds.every((id: any) => typeof id === 'string'))) &&
    (args.publicAccessCidrs === undefined || 
     (Array.isArray(args.publicAccessCidrs) && 
      args.publicAccessCidrs.every((cidr: any) => typeof cidr === 'string')))
  );
};

const isValidClusterStatusArgs = (args: any): args is { clusterName: string; region?: string } => {
  return (
    typeof args === 'object' &&
    args !== null &&
    typeof args.clusterName === 'string' &&
    (args.region === undefined || typeof args.region === 'string')
  );
};

const isValidDeleteClusterArgs = (args: any): args is { clusterName: string; region?: string } => {
  return (
    typeof args === 'object' &&
    args !== null &&
    typeof args.clusterName === 'string' &&
    (args.region === undefined || typeof args.region === 'string')
  );
};

const isValidListDeploymentsArgs = (args: any): args is { clusterName: string; region?: string; namespace?: string } => {
  return (
    typeof args === 'object' &&
    args !== null &&
    typeof args.clusterName === 'string' &&
    (args.region === undefined || typeof args.region === 'string') &&
    (args.namespace === undefined || typeof args.namespace === 'string')
  );
};

class AWSEKSServer {
  private server: Server;
  private eksManager: EKSManager;
  private k8sClient: K8sClient;

  constructor() {
    this.server = new Server(
      {
        name: 'aws-eks-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize AWS EKS manager
    this.eksManager = new EKSManager();
    this.k8sClient = new K8sClient(this.eksManager);

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'list_eks_clusters',
          description: 'Retrieve a list of all accessible EKS clusters',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'get_eks_cluster_status',
          description: 'Get detailed status information for a specific EKS cluster',
          inputSchema: {
            type: 'object',
            properties: {
              clusterName: {
                type: 'string',
                description: 'Name of the EKS cluster',
              },
              region: {
                type: 'string',
                description: 'AWS region (optional, uses default if not specified)',
              },
            },
            required: ['clusterName'],
          },
        },
        {
          name: 'create_eks_cluster',
          description: 'Create a new AWS EKS cluster',
          inputSchema: {
            type: 'object',
            properties: {
              clusterName: {
                type: 'string',
                description: 'Name for the new EKS cluster',
              },
              region: {
                type: 'string',
                description: 'AWS region where the cluster will be created',
              },
              kubernetesVersion: {
                type: 'string',
                description: 'Kubernetes version (e.g., "1.28")',
              },
              roleArn: {
                type: 'string',
                description: 'ARN of the IAM role for the EKS cluster',
              },
              subnetIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of subnet IDs for the cluster',
              },
              securityGroupIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of security group IDs (optional)',
              },
              publicAccessCidrs: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of CIDR blocks for public access (optional)',
              },
            },
            required: ['clusterName', 'region', 'kubernetesVersion', 'roleArn', 'subnetIds'],
          },
        },
        {
          name: 'delete_eks_cluster',
          description: 'Delete an AWS EKS cluster',
          inputSchema: {
            type: 'object',
            properties: {
              clusterName: {
                type: 'string',
                description: 'Name of the EKS cluster to delete',
              },
              region: {
                type: 'string',
                description: 'AWS region (optional, uses default if not specified)',
              },
            },
            required: ['clusterName'],
          },
        },
        {
          name: 'list_cluster_deployments',
          description: 'List Kubernetes pods and services in an EKS cluster',
          inputSchema: {
            type: 'object',
            properties: {
              clusterName: {
                type: 'string',
                description: 'Name of the EKS cluster',
              },
              region: {
                type: 'string',
                description: 'AWS region (optional, uses default if not specified)',
              },
              namespace: {
                type: 'string',
                description: 'Kubernetes namespace (optional, defaults to all namespaces)',
              },
            },
            required: ['clusterName'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case 'list_eks_clusters':
            return await this.handleListClusters();

          case 'get_eks_cluster_status':
            if (!isValidClusterStatusArgs(request.params.arguments)) {
              throw new McpError(
                ErrorCode.InvalidParams,
                'Invalid arguments for get_eks_cluster_status'
              );
            }
            return await this.handleGetClusterStatus(request.params.arguments);

          case 'create_eks_cluster':
            if (!isValidCreateClusterArgs(request.params.arguments)) {
              throw new McpError(
                ErrorCode.InvalidParams,
                'Invalid arguments for create_eks_cluster'
              );
            }
            return await this.handleCreateCluster(request.params.arguments);

          case 'delete_eks_cluster':
            if (!isValidDeleteClusterArgs(request.params.arguments)) {
              throw new McpError(
                ErrorCode.InvalidParams,
                'Invalid arguments for delete_eks_cluster'
              );
            }
            return await this.handleDeleteCluster(request.params.arguments);

          case 'list_cluster_deployments':
            if (!isValidListDeploymentsArgs(request.params.arguments)) {
              throw new McpError(
                ErrorCode.InvalidParams,
                'Invalid arguments for list_cluster_deployments'
              );
            }
            return await this.handleListDeployments(request.params.arguments);

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async handleListClusters() {
    try {
      const clusters = await this.eksManager.listClusters();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(clusters, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list clusters: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async handleGetClusterStatus(args: { clusterName: string; region?: string }) {
    try {
      const clusterDetails = await this.eksManager.getClusterStatus(args.clusterName, args.region);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(clusterDetails, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get cluster status: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async handleCreateCluster(args: CreateClusterRequest) {
    try {
      const result = await this.eksManager.createCluster(args);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create cluster: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async handleDeleteCluster(args: { clusterName: string; region?: string }) {
    try {
      const result = await this.eksManager.deleteCluster(args.clusterName, args.region);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to delete cluster: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async handleListDeployments(args: { clusterName: string; region?: string; namespace?: string }) {
    try {
      const deployments = await this.k8sClient.listClusterDeployments(
        args.clusterName,
        args.region,
        args.namespace
      );
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(deployments, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list deployments: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('AWS EKS MCP server running on stdio');
  }
}

const server = new AWSEKSServer();
server.run().catch(console.error);