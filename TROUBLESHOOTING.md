# AWS EKS MCP Server - Guide de Dépannage

## 🚨 Problème Actuel

**Erreur**: `User: arn:aws:iam::119788772833:user/francoisdecise is not authorized to perform: eks:ListClusters`

**Status**: Les permissions EKS ne sont pas correctement appliquées à l'utilisateur.

## 🔍 Vérifications à Effectuer

### 1. Vérifier les Politiques Attachées

Dans la console AWS IAM :
1. Allez sur **IAM** → **Users** → **francoisdecise**
2. Cliquez sur l'onglet **Permissions**
3. Vérifiez si vous voyez une politique contenant les permissions EKS

### 2. Vérifier la Propagation des Permissions

Les permissions AWS peuvent prendre **5-10 minutes** à se propager. Si vous venez d'ajouter la politique, attendez quelques minutes.

### 3. Solutions Étape par Étape

#### Option A: Politique Minimale (Recommandée pour le test)

1. **Créer une nouvelle politique** avec le contenu de [`minimal-eks-policy.json`](minimal-eks-policy.json):
   ```json
   {
       "Version": "2012-10-17",
       "Statement": [
           {
               "Effect": "Allow",
               "Action": [
                   "eks:ListClusters",
                   "eks:DescribeCluster"
               ],
               "Resource": "*"
           },
           {
               "Effect": "Allow",
               "Action": [
                   "sts:GetCallerIdentity"
               ],
               "Resource": "*"
           }
       ]
   }
   ```

2. **Nommer la politique**: `EKS-Minimal-Test-Policy`

3. **Attacher à l'utilisateur** `francoisdecise`

#### Option B: Utiliser une Politique AWS Gérée

Attachez cette politique AWS gérée à votre utilisateur :
- **Nom**: `AmazonEKSClusterPolicy`
- **ARN**: `arn:aws:iam::aws:policy/AmazonEKSClusterPolicy`

#### Option C: Politique Inline (Plus Rapide)

1. Allez sur **IAM** → **Users** → **francoisdecise**
2. Cliquez sur **Add permissions** → **Create inline policy**
3. Choisissez l'onglet **JSON**
4. Collez le contenu de [`minimal-eks-policy.json`](minimal-eks-policy.json)
5. Nommez-la `EKS-Inline-Policy`

## 🧪 Tests de Vérification

### Test 1: AWS CLI
```bash
# Testez avec vos credentials
AWS_ACCESS_KEY_ID=***REMOVED*** \
AWS_SECRET_ACCESS_KEY=***REMOVED*** \
AWS_REGION=us-east-1 \
aws eks list-clusters
```

**Résultat attendu**: 
- ✅ `{"clusters": []}` (si aucun cluster)
- ✅ `{"clusters": ["cluster-name"]}` (si des clusters existent)
- ❌ `AccessDeniedException` (permissions manquantes)

### Test 2: Vérification de l'identité
```bash
AWS_ACCESS_KEY_ID=***REMOVED*** \
AWS_SECRET_ACCESS_KEY=***REMOVED*** \
aws sts get-caller-identity
```

**Résultat attendu**:
```json
{
    "UserId": "AIDACKCEVSQ6C2EXAMPLE",
    "Account": "119788772833",
    "Arn": "arn:aws:iam::119788772833:user/francoisdecise"
}
```

## 🔧 Actions Immédiates

### Étape 1: Vérification Rapide
1. Connectez-vous à la [Console AWS IAM](https://console.aws.amazon.com/iam/)
2. Allez sur **Users** → **francoisdecise**
3. Vérifiez l'onglet **Permissions**

### Étape 2: Application de la Politique Minimale
1. Cliquez sur **Add permissions**
2. Choisissez **Create inline policy**
3. Utilisez le JSON de [`minimal-eks-policy.json`](minimal-eks-policy.json)
4. Sauvegardez avec le nom `EKS-Test-Policy`

### Étape 3: Test Immédiat
Attendez **2 minutes** puis testez à nouveau le serveur MCP.

## 📋 Checklist de Dépannage

- [ ] Politique créée dans AWS IAM
- [ ] Politique attachée à l'utilisateur `francoisdecise`
- [ ] Attendu 5 minutes pour la propagation
- [ ] Testé avec AWS CLI
- [ ] Vérifié les credentials dans le fichier MCP
- [ ] Redémarré le client MCP (si nécessaire)

## 🆘 Si le Problème Persiste

### Vérifications Avancées

1. **Vérifiez les Conditions de la Politique**:
   - Assurez-vous qu'il n'y a pas de conditions restrictives
   - Vérifiez qu'il n'y a pas de `Deny` explicite

2. **Vérifiez les Limites de Permissions**:
   - L'utilisateur pourrait avoir des limites de permissions (Permission Boundaries)

3. **Vérifiez l'Organisation AWS**:
   - Si vous êtes dans une organisation AWS, il pourrait y avoir des SCPs (Service Control Policies) restrictives

### Contact Support

Si rien ne fonctionne :
1. Vérifiez les logs CloudTrail pour voir les tentatives d'accès
2. Contactez votre administrateur AWS
3. Créez un ticket de support AWS

## 🎯 Objectif

Une fois les permissions correctement configurées, vous devriez pouvoir :
- ✅ Lister les clusters EKS
- ✅ Obtenir le statut des clusters
- ✅ Utiliser tous les outils du serveur MCP EKS

---

**Note**: Ce problème est courant et généralement résolu en quelques minutes une fois la bonne politique appliquée.