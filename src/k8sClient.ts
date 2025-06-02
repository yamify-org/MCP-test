import * as k8s from '@kubernetes/client-node';
import { EKSManager } from './eksManager.js';
import { DeploymentsInfo, PodInfo, ServiceInfo } from './types.js';

export class K8sClient {
  private eksManager: EKSManager;

  constructor(eksManager: EKSManager) {
    this.eksManager = eksManager;
  }

  /**
   * List deployments (pods and services) in an EKS cluster
   */
  async listClusterDeployments(
    clusterName: string,
    region?: string,
    namespace?: string
  ): Promise<DeploymentsInfo> {
    try {
      // Get cluster details from EKS
      const clusterDetails = await this.eksManager.getClusterStatus(clusterName, region);
      
      // Create Kubernetes configuration
      const kc = new k8s.KubeConfig();
      
      // Configure for EKS authentication
      await this.configureEKSAuth(kc, clusterDetails, region || 'us-east-1');
      
      // Create API clients
      const coreV1Api = kc.makeApiClient(k8s.CoreV1Api);
      
      // Determine namespace to query
      const targetNamespace = namespace === 'all' || !namespace ? undefined : namespace;
      
      // Get pods
      const podsResponse = await coreV1Api.listPodForAllNamespaces(
        undefined, // allowWatchBookmarks
        undefined, // continue
        undefined, // fieldSelector
        undefined, // labelSelector
        undefined, // limit
        undefined, // pretty
        undefined, // resourceVersion
        undefined, // resourceVersionMatch
        undefined, // timeoutSeconds
        undefined  // watch
      );
      
      // Get services
      const servicesResponse = await coreV1Api.listServiceForAllNamespaces(
        undefined, // allowWatchBookmarks
        undefined, // continue
        undefined, // fieldSelector
        undefined, // labelSelector
        undefined, // limit
        undefined, // pretty
        undefined, // resourceVersion
        undefined, // resourceVersionMatch
        undefined, // timeoutSeconds
        undefined  // watch
      );
      
      // Filter by namespace if specified
      const filteredPods = targetNamespace 
        ? podsResponse.body.items.filter(pod => pod.metadata?.namespace === targetNamespace)
        : podsResponse.body.items;
        
      const filteredServices = targetNamespace
        ? servicesResponse.body.items.filter(service => service.metadata?.namespace === targetNamespace)
        : servicesResponse.body.items;
      
      // Map to our interfaces
      const pods: PodInfo[] = filteredPods.map(pod => ({
        name: pod.metadata?.name || 'unknown',
        namespace: pod.metadata?.namespace || 'default',
        status: pod.status?.phase || 'Unknown',
        ready: this.getPodReadyStatus(pod),
        restarts: this.getPodRestartCount(pod),
        age: this.calculateAge(pod.metadata?.creationTimestamp?.toString()),
        node: pod.spec?.nodeName || 'unknown',
      }));
      
      const services: ServiceInfo[] = filteredServices.map(service => ({
        name: service.metadata?.name || 'unknown',
        namespace: service.metadata?.namespace || 'default',
        type: service.spec?.type || 'ClusterIP',
        clusterIP: service.spec?.clusterIP || 'None',
        externalIP: this.getExternalIP(service),
        ports: this.getServicePorts(service),
        age: this.calculateAge(service.metadata?.creationTimestamp?.toString()),
      }));
      
      return { pods, services };
      
    } catch (error) {
      console.error(`Error listing deployments for cluster ${clusterName}:`, error);
      throw new Error(`Failed to list cluster deployments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Configure Kubernetes client for EKS authentication
   */
  private async configureEKSAuth(kc: k8s.KubeConfig, clusterDetails: any, region: string): Promise<void> {
    try {
      // Get AWS caller identity for token generation
      const identity = await this.eksManager.getCallerIdentity();
      
      // Generate EKS token (simplified approach)
      // In a real implementation, you would use aws-iam-authenticator or similar
      const token = await this.generateEKSToken(clusterDetails.name, region);
      
      // Configure kubeconfig
      const cluster = {
        name: clusterDetails.name,
        server: clusterDetails.endpoint,
        certificateAuthorityData: clusterDetails.certificateAuthority?.data,
        skipTLSVerify: false,
      };
      
      const user = {
        name: `${clusterDetails.name}-user`,
        token: token,
      };
      
      const context = {
        name: clusterDetails.name,
        cluster: clusterDetails.name,
        user: user.name,
      };
      
      kc.loadFromOptions({
        clusters: [cluster],
        users: [user],
        contexts: [context],
        currentContext: context.name,
      });
      
    } catch (error) {
      console.error('Error configuring EKS authentication:', error);
      throw new Error(`Failed to configure EKS authentication: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate EKS authentication token
   * This is a simplified implementation - in production you would use aws-iam-authenticator
   */
  private async generateEKSToken(clusterName: string, region: string): Promise<string> {
    // This is a placeholder implementation
    // In a real scenario, you would use the AWS CLI or aws-iam-authenticator
    // to generate a proper EKS token
    
    // For now, we'll return a placeholder token
    // The actual implementation would involve:
    // 1. Creating a presigned URL for the EKS cluster
    // 2. Encoding it as a token that EKS can validate
    
    const tokenPrefix = 'k8s-aws-v1.';
    const clusterInfo = Buffer.from(JSON.stringify({
      cluster: clusterName,
      region: region,
      timestamp: Date.now(),
    })).toString('base64');
    
    return `${tokenPrefix}${clusterInfo}`;
  }

  /**
   * Get pod ready status (e.g., "1/1", "0/1")
   */
  private getPodReadyStatus(pod: k8s.V1Pod): string {
    if (!pod.status?.containerStatuses) {
      return '0/0';
    }
    
    const ready = pod.status.containerStatuses.filter(status => status.ready).length;
    const total = pod.status.containerStatuses.length;
    
    return `${ready}/${total}`;
  }

  /**
   * Get total restart count for all containers in a pod
   */
  private getPodRestartCount(pod: k8s.V1Pod): number {
    if (!pod.status?.containerStatuses) {
      return 0;
    }
    
    return pod.status.containerStatuses.reduce(
      (total, status) => total + (status.restartCount || 0),
      0
    );
  }

  /**
   * Get external IP for a service
   */
  private getExternalIP(service: k8s.V1Service): string {
    if (service.status?.loadBalancer?.ingress) {
      const ingress = service.status.loadBalancer.ingress[0];
      return ingress.ip || ingress.hostname || '<pending>';
    }
    
    if (service.spec?.externalIPs && service.spec.externalIPs.length > 0) {
      return service.spec.externalIPs.join(',');
    }
    
    return '<none>';
  }

  /**
   * Get formatted ports string for a service
   */
  private getServicePorts(service: k8s.V1Service): string {
    if (!service.spec?.ports || service.spec.ports.length === 0) {
      return '<none>';
    }
    
    return service.spec.ports
      .map(port => {
        const protocol = port.protocol || 'TCP';
        if (port.nodePort) {
          return `${port.port}:${port.nodePort}/${protocol}`;
        }
        return `${port.port}/${protocol}`;
      })
      .join(',');
  }

  /**
   * Calculate age from creation timestamp
   */
  private calculateAge(creationTimestamp?: string): string {
    if (!creationTimestamp) {
      return 'unknown';
    }
    
    const created = new Date(creationTimestamp);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days}d`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${minutes}m`;
    }
  }
}