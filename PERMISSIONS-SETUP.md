# AWS EKS MCP Server - Permissions Setup Guide

## Current Status

✅ **AWS Credentials**: Working correctly  
✅ **MCP Server**: Successfully connecting to AWS  
❌ **EKS Permissions**: User `francoisdecise` needs EKS permissions  

## Required Actions

Your AWS user needs additional permissions to use the EKS MCP server. Follow these steps:

### Option 1: Using AWS Console (Recommended)

1. **Go to AWS IAM Console**:
   - Open [AWS IAM Console](https://console.aws.amazon.com/iam/)
   - Navigate to "Users" → "francoisdecise"

2. **Create a Custom Policy**:
   - Click "Add permissions" → "Attach policies directly"
   - Click "Create policy"
   - Choose "JSON" tab
   - Copy and paste the content from [`aws-iam-policy.json`](aws-iam-policy.json)
   - Click "Next: Tags" → "Next: Review"
   - Name it: `EKS-MCP-Server-Policy`
   - Click "Create policy"

3. **Attach the Policy**:
   - Go back to your user "francoisdecise"
   - Click "Add permissions" → "Attach policies directly"
   - Search for `EKS-MCP-Server-Policy`
   - Select it and click "Add permissions" 

### Option 2: Using AWS CLI

If you have AWS CLI configured:

```bash
# Create the policy
aws iam create-policy \
    --policy-name EKS-MCP-Server-Policy \
    --policy-document file://aws-iam-policy.json

# Attach to your user (replace ACCOUNT-ID with your account number)
aws iam attach-user-policy \
    --user-name francoisdecise \
    --policy-arn arn:aws:iam::119788772833:policy/EKS-MCP-Server-Policy
```

### Option 3: Use Existing AWS Managed Policies (Alternative)

If you prefer using AWS managed policies, attach these to your user:

- `AmazonEKSClusterPolicy` - For basic EKS operations
- `AmazonEKSServicePolicy` - For EKS service operations  
- `AmazonEC2ReadOnlyAccess` - For VPC/subnet information
- `IAMReadOnlyAccess` - For role information

## Minimal Permissions (For Testing Only)

If you just want to test the server with minimal permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "eks:ListClusters",
                "eks:DescribeCluster",
                "sts:GetCallerIdentity"
            ],
            "Resource": "*"
        }
    ]
}
```

## Verification Steps

After adding permissions:

1. **Wait 1-2 minutes** for permissions to propagate
2. **Test the connection**:
   ```bash
   # In the aws-eks-server directory
   npm test
   ```
3. **Or test via MCP**: Ask me to "list EKS clusters" again

## Security Best Practices

- **Principle of Least Privilege**: Only grant permissions you actually need
- **Use IAM Roles**: Consider using IAM roles instead of user credentials for production
- **Regular Audits**: Review and remove unused permissions periodically
- **Temporary Credentials**: Use temporary credentials when possible

## Troubleshooting

### Common Permission Errors:

**"not authorized to perform: eks:ListClusters"**
- Solution: Add the EKS permissions from the policy above

**"not authorized to perform: sts:GetCallerIdentity"**  
- Solution: Add STS permissions (included in the policy)

**"Access Denied" when creating clusters**
- Solution: Ensure you have `eks:CreateCluster` and related IAM permissions

### Testing Individual Permissions:

```bash
# Test if you can list clusters
aws eks list-clusters --region us-east-1

# Test if you can describe a specific cluster (if you have any)
aws eks describe-cluster --name YOUR-CLUSTER-NAME --region us-east-1

# Test caller identity
aws sts get-caller-identity
```

## Next Steps

1. ✅ Add the required permissions using one of the methods above
2. ✅ Wait for permissions to propagate (1-2 minutes)
3. ✅ Test the MCP server functionality
4. ✅ Start using the EKS management tools!

## Available Tools After Setup

Once permissions are configured, you'll be able to use:

- **List Clusters**: "Show me all my EKS clusters"
- **Cluster Status**: "What's the status of cluster X?"
- **Create Cluster**: "Create a new EKS cluster named Y"
- **Delete Cluster**: "Delete the cluster Z"
- **List Deployments**: "Show me all pods in cluster X"

---

**Need Help?** If you encounter any issues, the error messages from the MCP server will guide you to the specific permissions needed.