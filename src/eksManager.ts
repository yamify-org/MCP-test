import {
  EKSClient,
  ListClustersCommand,
  DescribeClusterCommand,
  CreateClusterCommand,
  DeleteClusterCommand,
  Cluster,
} from '@aws-sdk/client-eks';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import {
  ClusterInfo,
  ClusterDetails,
  CreateClusterRequest,
  OperationStatus,
  EKSCredentials,
} from './types.js';

export class EKSManager {
  private eksClient: EKSClient;
  private stsClient: STSClient;

  constructor(credentials?: EKSCredentials) {
    const config = credentials
      ? {
          region: credentials.region,
          credentials: {
            accessKeyId: credentials.accessKeyId!,
            secretAccessKey: credentials.secretAccessKey!,
            sessionToken: credentials.sessionToken,
          },
        }
      : { region: process.env.AWS_REGION || 'us-east-1' };

    this.eksClient = new EKSClient(config);
    this.stsClient = new STSClient(config);
  }

  /**
   * List all EKS clusters in the configured region
   */
  async listClusters(): Promise<ClusterInfo[]> {
    try {
      const command = new ListClustersCommand({});
      const response = await this.eksClient.send(command);

      if (!response.clusters) {
        return [];
      }

      // Get detailed information for each cluster
      const clusterDetails = await Promise.all(
        response.clusters.map(async (clusterName) => {
          try {
            const detailCommand = new DescribeClusterCommand({
              name: clusterName,
            });
            const detailResponse = await this.eksClient.send(detailCommand);
            const cluster = detailResponse.cluster!;

            return {
              name: cluster.name!,
              region: this.eksClient.config.region as string,
              status: cluster.status!,
            };
          } catch (error) {
            console.error(`Error getting details for cluster ${clusterName}:`, error);
            return {
              name: clusterName,
              region: this.eksClient.config.region as string,
              status: 'UNKNOWN',
            };
          }
        })
      );

      return clusterDetails;
    } catch (error) {
      console.error('Error listing EKS clusters:', error);
      throw new Error(`Failed to list EKS clusters: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get detailed status of a specific EKS cluster
   */
  async getClusterStatus(clusterName: string, region?: string): Promise<ClusterDetails> {
    try {
      // Update region if provided
      if (region && region !== this.eksClient.config.region) {
        this.eksClient = new EKSClient({ region });
      }

      const command = new DescribeClusterCommand({ name: clusterName });
      const response = await this.eksClient.send(command);

      if (!response.cluster) {
        throw new Error(`Cluster ${clusterName} not found`);
      }

      const cluster = response.cluster;
      return this.mapClusterToDetails(cluster);
    } catch (error) {
      console.error(`Error getting cluster status for ${clusterName}:`, error);
      throw new Error(`Failed to get cluster status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new EKS cluster
   */
  async createCluster(request: CreateClusterRequest): Promise<OperationStatus> {
    try {
      // Update region if different
      if (request.region !== this.eksClient.config.region) {
        this.eksClient = new EKSClient({ region: request.region });
      }

      const command = new CreateClusterCommand({
        name: request.clusterName,
        version: request.kubernetesVersion,
        roleArn: request.roleArn,
        resourcesVpcConfig: {
          subnetIds: request.subnetIds,
          securityGroupIds: request.securityGroupIds,
          endpointPrivateAccess: true,
          endpointPublicAccess: true,
          publicAccessCidrs: request.publicAccessCidrs || ['0.0.0.0/0'],
        },
        logging: {
          clusterLogging: [
            {
              types: ['api', 'audit', 'authenticator', 'controllerManager', 'scheduler'],
              enabled: true,
            },
          ],
        },
      });

      const response = await this.eksClient.send(command);

      if (!response.cluster) {
        throw new Error('Failed to create cluster - no cluster data returned');
      }

      return {
        status: 'SUCCESS',
        message: `Cluster ${request.clusterName} creation initiated successfully`,
        clusterDetails: this.mapClusterToDetails(response.cluster),
      };
    } catch (error) {
      console.error(`Error creating cluster ${request.clusterName}:`, error);
      return {
        status: 'FAILURE',
        message: `Failed to create cluster: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Delete an EKS cluster
   */
  async deleteCluster(clusterName: string, region?: string): Promise<OperationStatus> {
    try {
      // Update region if provided
      if (region && region !== this.eksClient.config.region) {
        this.eksClient = new EKSClient({ region });
      }

      const command = new DeleteClusterCommand({ name: clusterName });
      await this.eksClient.send(command);

      return {
        status: 'SUCCESS',
        message: `Cluster ${clusterName} deletion initiated successfully`,
      };
    } catch (error) {
      console.error(`Error deleting cluster ${clusterName}:`, error);
      return {
        status: 'FAILURE',
        message: `Failed to delete cluster: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get AWS caller identity for authentication
   */
  async getCallerIdentity() {
    try {
      const command = new GetCallerIdentityCommand({});
      return await this.stsClient.send(command);
    } catch (error) {
      console.error('Error getting caller identity:', error);
      throw new Error(`Failed to get caller identity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Map AWS EKS Cluster object to our ClusterDetails interface
   */
  private mapClusterToDetails(cluster: Cluster): ClusterDetails {
    return {
      name: cluster.name!,
      arn: cluster.arn!,
      status: cluster.status!,
      version: cluster.version!,
      endpoint: cluster.endpoint!,
      createdAt: cluster.createdAt!,
      roleArn: cluster.roleArn!,
      vpcConfig: {
        subnetIds: cluster.resourcesVpcConfig?.subnetIds || [],
        securityGroupIds: cluster.resourcesVpcConfig?.securityGroupIds || [],
        endpointConfigResponse: {
          privateAccess: cluster.resourcesVpcConfig?.endpointPrivateAccess || false,
          publicAccess: cluster.resourcesVpcConfig?.endpointPublicAccess || false,
          publicAccessCidrs: cluster.resourcesVpcConfig?.publicAccessCidrs || [],
        },
      },
      logging: {
        clusterLogging: cluster.logging?.clusterLogging?.map(log => ({
          types: log.types?.map(type => type.toString()) || [],
          enabled: log.enabled || false,
        })) || [],
      },
      platformVersion: cluster.platformVersion!,
      tags: cluster.tags || {},
    };
  }
}