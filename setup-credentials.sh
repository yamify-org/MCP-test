#!/bin/bash

echo "AWS EKS MCP Server - Credential Setup"
echo "====================================="
echo ""

# Check if MCP settings file exists
MCP_SETTINGS_FILE="/home/codespace/.vscode-remote/data/User/globalStorage/kilocode.kilo-code/settings/mcp_settings.json"

if [ ! -f "$MCP_SETTINGS_FILE" ]; then
    echo "Error: MCP settings file not found at $MCP_SETTINGS_FILE"
    exit 1
fi

echo "This script will help you configure AWS credentials for the EKS MCP server."
echo "Your credentials will be stored securely in the MCP settings file."
echo ""

# Prompt for AWS credentials
read -p "Enter your AWS Access Key ID: " AWS_ACCESS_KEY_ID
read -s -p "Enter your AWS Secret Access Key: " AWS_SECRET_ACCESS_KEY
echo ""
read -p "Enter your preferred AWS region (default: us-east-1): " AWS_REGION

# Set default region if not provided
if [ -z "$AWS_REGION" ]; then
    AWS_REGION="us-east-1"
fi

echo ""
echo "Updating MCP settings with your credentials..."

# Create a temporary file with updated credentials
python3 << EOF
import json
import sys

try:
    # Read the current MCP settings
    with open('$MCP_SETTINGS_FILE', 'r') as f:
        settings = json.load(f)
    
    # Update the AWS EKS server configuration
    if 'mcpServers' in settings and 'aws-eks-server' in settings['mcpServers']:
        settings['mcpServers']['aws-eks-server']['env']['AWS_ACCESS_KEY_ID'] = '$AWS_ACCESS_KEY_ID'
        settings['mcpServers']['aws-eks-server']['env']['AWS_SECRET_ACCESS_KEY'] = '$AWS_SECRET_ACCESS_KEY'
        settings['mcpServers']['aws-eks-server']['env']['AWS_REGION'] = '$AWS_REGION'
        
        # Write back to file
        with open('$MCP_SETTINGS_FILE', 'w') as f:
            json.dump(settings, f, indent=2)
        
        print("✅ Credentials updated successfully!")
        print(f"✅ Region set to: $AWS_REGION")
    else:
        print("❌ Error: aws-eks-server not found in MCP settings")
        sys.exit(1)
        
except Exception as e:
    print(f"❌ Error updating credentials: {e}")
    sys.exit(1)
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Setup complete! Your AWS EKS MCP server is now configured."
    echo ""
    echo "Next steps:"
    echo "1. Restart your MCP client to load the new server"
    echo "2. Test the connection by listing your EKS clusters"
    echo ""
    echo "Available tools:"
    echo "- list_eks_clusters"
    echo "- get_eks_cluster_status"
    echo "- create_eks_cluster"
    echo "- delete_eks_cluster"
    echo "- list_cluster_deployments"
else
    echo ""
    echo "❌ Setup failed. Please check the error messages above."
    exit 1
fi