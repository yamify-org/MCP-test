# AWS EKS MCP Server

A Model Context Protocol (MCP) server for managing AWS EKS clusters and Kubernetes deployments. This server provides tools for AI agents to interact intelligently with AWS EKS infrastructure.

## Features

The server exposes 5 main tools for EKS cluster management:

### 1. List EKS Clusters (`list_eks_clusters`)
- **Description**: Retrieve a list of all accessible EKS clusters
- **Inputs**: None
- **Outputs**: Array of ClusterInfo objects (name, region, status)

### 2. Get EKS Cluster Status (`get_eks_cluster_status`)
- **Description**: Get detailed status information for a specific EKS cluster
- **Inputs**: 
  - `clusterName` (string, required): Name of the EKS cluster
  - `region` (string, optional): AWS region
- **Outputs**: ClusterDetails object with comprehensive cluster information

### 3. Create EKS Cluster (`create_eks_cluster`)
- **Description**: Create a new AWS EKS cluster
- **Inputs**:
  - `clusterName` (string, required): Name for the new cluster
  - `region` (string, required): AWS region
  - `kubernetesVersion` (string, required): Kubernetes version (e.g., "1.28")
  - `roleArn` (string, required): IAM role ARN for the cluster
  - `subnetIds` (array, required): Array of subnet IDs
  - `securityGroupIds` (array, optional): Array of security group IDs
  - `publicAccessCidrs` (array, optional): Array of CIDR blocks for public access
- **Outputs**: OperationStatus with success/failure and cluster details

### 4. Delete EKS Cluster (`delete_eks_cluster`)
- **Description**: Delete an AWS EKS cluster
- **Inputs**:
  - `clusterName` (string, required): Name of the cluster to delete
  - `region` (string, optional): AWS region
- **Outputs**: OperationStatus with success/failure message

### 5. List Cluster Deployments (`list_cluster_deployments`)
- **Description**: List Kubernetes pods and services in an EKS cluster
- **Inputs**:
  - `clusterName` (string, required): Name of the EKS cluster
  - `region` (string, optional): AWS region
  - `namespace` (string, optional): Kubernetes namespace (defaults to all namespaces)
- **Outputs**: DeploymentsInfo object with arrays of pods and services

## Installation

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

## Configuration

### AWS Authentication

The server uses standard AWS SDK authentication methods. Configure your AWS credentials using one of these methods:

1. **Environment Variables**:
```bash
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=us-east-1
```

2. **AWS Credentials File** (`~/.aws/credentials`):
```ini
[default]
aws_access_key_id = your_access_key
aws_secret_access_key = your_secret_key
region = us-east-1
```

3. **IAM Roles** (when running on EC2 instances)

### Required IAM Permissions

The AWS credentials must have the following permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "eks:ListClusters",
                "eks:DescribeCluster",
                "eks:CreateCluster",
                "eks:DeleteCluster",
                "sts:GetCallerIdentity"
            ],
            "Resource": "*"
        }
    ]
}
```

For Kubernetes operations, additional permissions may be required based on your cluster's RBAC configuration.

## Usage Examples

### Example Tool Calls

#### List all EKS clusters:
```json
{
    "tool": "list_eks_clusters",
    "arguments": {}
}
```

#### Get cluster status:
```json
{
    "tool": "get_eks_cluster_status",
    "arguments": {
        "clusterName": "my-cluster",
        "region": "us-east-1"
    }
}
```

#### Create a new cluster:
```json
{
    "tool": "create_eks_cluster",
    "arguments": {
        "clusterName": "new-cluster",
        "region": "us-east-1",
        "kubernetesVersion": "1.28",
        "roleArn": "arn:aws:iam::123456789012:role/eks-service-role",
        "subnetIds": ["subnet-12345", "subnet-67890"],
        "securityGroupIds": ["sg-12345"],
        "publicAccessCidrs": ["0.0.0.0/0"]
    }
}
```

#### Delete a cluster:
```json
{
    "tool": "delete_eks_cluster",
    "arguments": {
        "clusterName": "old-cluster",
        "region": "us-east-1"
    }
}
```

#### List deployments in a cluster:
```json
{
    "tool": "list_cluster_deployments",
    "arguments": {
        "clusterName": "my-cluster",
        "region": "us-east-1",
        "namespace": "default"
    }
}
```

### cURL Examples

If running as a standalone Express server (development mode):

```bash
# List clusters
curl -X GET http://localhost:3000/eks/clusters

# Get cluster status
curl -X GET "http://localhost:3000/eks/cluster/my-cluster/status?region=us-east-1"

# Create cluster
curl -X POST http://localhost:3000/eks/cluster \
  -H "Content-Type: application/json" \
  -d '{
    "clusterName": "new-cluster",
    "region": "us-east-1",
    "kubernetesVersion": "1.28",
    "roleArn": "arn:aws:iam::123456789012:role/eks-service-role",
    "subnetIds": ["subnet-12345", "subnet-67890"]
  }'

# Delete cluster
curl -X DELETE "http://localhost:3000/eks/cluster/old-cluster?region=us-east-1"

# List deployments
curl -X GET "http://localhost:3000/eks/cluster/my-cluster/deployments?region=us-east-1&namespace=default"
```

## Architecture

The server is built with:

- **Node.js** with **TypeScript** for type safety
- **@modelcontextprotocol/sdk** for MCP server implementation
- **@aws-sdk/client-eks** for AWS EKS operations
- **@aws-sdk/client-sts** for AWS authentication
- **@kubernetes/client-node** for Kubernetes API interactions

### Project Structure

```
aws-eks-server/
├── src/
│   ├── index.ts          # Main MCP server implementation
│   ├── eksManager.ts     # AWS EKS operations
│   ├── k8sClient.ts      # Kubernetes client operations
│   └── types.ts          # TypeScript interfaces
├── build/                # Compiled JavaScript output
├── package.json
├── tsconfig.json
└── README.md
```

## Error Handling

The server implements comprehensive error handling:

- **AWS API Errors**: Proper error messages for AWS service issues
- **Kubernetes API Errors**: Detailed error reporting for cluster connectivity issues
- **Validation Errors**: Input parameter validation with clear error messages
- **Authentication Errors**: Clear messages for credential or permission issues

## Security Considerations

1. **Credentials**: Never hardcode AWS credentials in the source code
2. **IAM Permissions**: Use least-privilege principle for IAM roles
3. **Network Security**: Ensure proper VPC and security group configurations
4. **Cluster Access**: Implement proper RBAC for Kubernetes operations

## Limitations

1. **EKS Token Generation**: The current implementation uses a simplified token generation approach. For production use, consider integrating with `aws-iam-authenticator` or similar tools.

2. **Kubernetes Authentication**: The Kubernetes client authentication is simplified and may need enhancement for complex cluster configurations.

3. **Error Recovery**: Some operations (like cluster creation/deletion) are long-running and may require polling for completion status.

## Development

### Running in Development Mode

```bash
# Watch mode for development
npm run dev

# Start the server
npm start
```

### Building

```bash
npm run build
```

The compiled JavaScript will be output to the `build/` directory with executable permissions.