export interface ClusterInfo {
  name: string;
  region: string;
  status: string;
}

export interface ClusterDetails {
  name: string;
  arn: string;
  status: string;
  version: string;
  endpoint: string;
  createdAt: Date;
  roleArn: string;
  vpcConfig: {
    subnetIds: string[];
    securityGroupIds: string[];
    endpointConfigResponse: {
      privateAccess: boolean;
      publicAccess: boolean;
      publicAccessCidrs: string[];
    };
  };
  logging: {
    clusterLogging: Array<{
      types: string[];
      enabled: boolean;
    }>;
  };
  platformVersion: string;
  tags: Record<string, string>;
}

export interface CreateClusterRequest {
  clusterName: string;
  region: string;
  kubernetesVersion: string;
  roleArn: string;
  subnetIds: string[];
  securityGroupIds?: string[];
  publicAccessCidrs?: string[];
}

export interface OperationStatus {
  status: 'SUCCESS' | 'FAILURE';
  message: string;
  clusterDetails?: ClusterDetails;
}

export interface PodInfo {
  name: string;
  namespace: string;
  status: string;
  ready: string;
  restarts: number;
  age: string;
  node: string;
}

export interface ServiceInfo {
  name: string;
  namespace: string;
  type: string;
  clusterIP: string;
  externalIP: string;
  ports: string;
  age: string;
}

export interface DeploymentsInfo {
  pods: PodInfo[];
  services: ServiceInfo[];
}

export interface EKSCredentials {
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  region: string;
}