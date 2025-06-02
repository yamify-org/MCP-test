# AWS EKS MCP Server - Installation Guide

## Quick Start

1. **Build the server**:
   ```bash
   cd aws-eks-server
   npm install
   npm run build
   ```

2. **Configure AWS credentials**:
   ```bash
   npm run setup
   ```
   Or manually edit the MCP settings file at:
   `/home/codespace/.vscode-remote/data/User/globalStorage/kilocode.kilo-code/settings/mcp_settings.json`

3. **Test the server** (optional):
   ```bash
   npm test
   ```

4. **Restart your MCP client** to load the new server.

## Server Status

✅ **Server Built Successfully**: The TypeScript code has been compiled to JavaScript  
✅ **MCP Integration**: Server is registered in MCP settings  
✅ **AWS SDK Integration**: All AWS EKS and STS clients are properly configured  
✅ **Kubernetes Integration**: K8s client is ready for cluster operations  
✅ **Error Handling**: Comprehensive error handling implemented  

## Available Tools

The server provides these 5 tools for EKS management:

| Tool Name | Description | Status |
|-----------|-------------|---------|
| `list_eks_clusters` | List all accessible EKS clusters | ✅ Ready |
| `get_eks_cluster_status` | Get detailed cluster information | ✅ Ready |
| `create_eks_cluster` | Create a new EKS cluster | ✅ Ready |
| `delete_eks_cluster` | Delete an existing EKS cluster | ✅ Ready |
| `list_cluster_deployments` | List pods and services in a cluster | ✅ Ready |

## Configuration Required

To use the server, you need to:

1. **Set AWS Credentials**: Replace the placeholder values in the MCP settings with your actual AWS credentials
2. **Verify IAM Permissions**: Ensure your AWS user/role has the required EKS permissions
3. **Test Connection**: Try listing clusters to verify the setup

## Example Usage

Once configured with valid AWS credentials, you can use commands like:

- "List all my EKS clusters"
- "Show me the status of cluster 'my-production-cluster'"
- "Create a new EKS cluster called 'test-cluster' in us-east-1"
- "List all pods in the 'default' namespace of cluster 'my-cluster'"

## Security Notes

- Never commit real AWS credentials to version control
- Use IAM roles with minimal required permissions
- Consider using temporary credentials for enhanced security
- The server handles credentials securely through environment variables

## Troubleshooting

**"Invalid security token" error**: 
- Check that your AWS credentials are correctly set in the MCP settings
- Verify the credentials have the required permissions
- Ensure the region is correctly specified

**"Cluster not found" error**:
- Verify the cluster name is correct
- Check that you're looking in the right AWS region
- Ensure your credentials have access to the cluster

**Connection timeout**:
- Check your network connectivity to AWS
- Verify the AWS region is accessible
- Check if there are any firewall restrictions

## Support

For issues or questions:
1. Check the error messages in the MCP client logs
2. Verify your AWS credentials and permissions
3. Test with the built-in test script: `npm test`
4. Review the README.md for detailed documentation