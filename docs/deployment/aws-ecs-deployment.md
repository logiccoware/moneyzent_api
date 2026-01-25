# AWS ECS Fargate Deployment Guide

This guide covers deploying the Monovra API to AWS ECS Fargate with GitHub Actions CI/CD.

## Architecture Overview

```
                                    ┌─────────────────┐
                                    │   Namecheap     │
                                    │ api.monovra.com │
                                    └────────┬────────┘
                                             │ CNAME
                                             ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  GitHub Actions │────▶│   Amazon ECR    │     │ Application LB  │────▶│   ECS Fargate   │
│    (CI/CD)      │     │ (Container Reg) │     │ (HTTPS/SSL)     │     │   (Runtime)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
                                                                                │
                        ┌───────────────────────────────────────────────────────┴───────────────────────────────┐
                        │                               │                               │                       │
                        ▼                               ▼                               ▼                       ▼
                ┌───────────────┐              ┌───────────────┐              ┌───────────────┐      ┌───────────────┐
                │ Secrets Mgr   │              │ Parameter     │              │    RDS        │      │     ACM       │
                │ (Secrets)     │              │ Store (Config)│              │ (PostgreSQL)  │      │ (SSL Cert)    │
                └───────────────┘              └───────────────┘              └───────────────┘      └───────────────┘
```

## Production URL

**API Endpoint:** https://api.monovra.com

## Current Production Configuration

### AWS Resources

| Resource | Value |
|----------|-------|
| AWS Account | `283941296486` |
| Region | `us-east-1` |
| ECR Repository | `prod-monovra-api` |
| ECS Cluster | `prod-monovra-cluster` |
| ECS Service | `prod-monovra-api-service` |
| RDS Instance | `monovra-db-prod` |
| RDS Endpoint | `monovra-db-prod.cc3ycyakou61.us-east-1.rds.amazonaws.com` |

### Load Balancer & SSL

| Resource | Value |
|----------|-------|
| ALB Name | `prod-monovra-alb` |
| ALB ARN | `arn:aws:elasticloadbalancing:us-east-1:283941296486:loadbalancer/app/prod-monovra-alb/f59bc098d9fd9850` |
| ALB DNS | `prod-monovra-alb-1309997420.us-east-1.elb.amazonaws.com` |
| Target Group | `prod-monovra-api-tg` |
| Target Group ARN | `arn:aws:elasticloadbalancing:us-east-1:283941296486:targetgroup/prod-monovra-api-tg/6d4777454441fd12` |
| SSL Certificate | `arn:aws:acm:us-east-1:283941296486:certificate/4fa0ae51-258b-4ff0-9713-e90a334b5086` |
| Domain | `api.monovra.com` |

### Networking

| Resource | Value |
|----------|-------|
| VPC | `vpc-0347d329ae58f5de0` (default) |
| Subnets | `subnet-036208991a973a7ee`, `subnet-03fb27e78fbf983d5` |
| ECS Security Group | `sg-00d8b446bca7ca405` (port 3000) |
| ALB Security Group | `sg-00ce8af78768e0c59` (ports 80, 443) |
| RDS Security Group | `sg-085597fe7d48abdb0` (port 5432) |

### Secrets Manager

| Secret Name | ARN Suffix | Purpose |
|-------------|------------|---------|
| `prod/monovra/database-url` | `-KbawNp` | PostgreSQL connection string |
| `prod/monovra/better-auth-secret` | `-zvQ4vZ` | Better Auth encryption key |

### Parameter Store

| Parameter | Purpose |
|-----------|---------|
| `/monovra/prod/app-env` | Application environment |
| `/monovra/prod/better-auth-url` | Better Auth base URL |
| `/monovra/prod/cors-origin` | Allowed CORS origin |
| `/monovra/prod/database-pool-size` | Database connection pool size |

### IAM Roles

| Role | Purpose |
|------|---------|
| `ecsTaskExecutionRole` | Pull images, access secrets/parameters |
| `ecsTaskRole` | Runtime permissions for the container |
| `github-actions-monovra` | CI/CD deployment user |

## CI/CD Pipeline

### Deploy Workflow

The GitHub Actions workflow (`.github/workflows/deploy.yml`) runs on every push to `main`:

1. **Test** - Lints the code
2. **Build** - Builds Docker image and pushes to ECR
3. **Register** - Registers new ECS task definition with the new image
4. **Migrate** - Runs database migrations using the new image (before deploying)
5. **Deploy** - Updates ECS service with new task definition

**Important:** Migrations run AFTER building the image but BEFORE deploying the service. This ensures:
- New migration files are available in the Docker image
- Migrations complete successfully before new code goes live
- Deployment fails safely if migrations fail

### Manual Migration Workflow

For ad-hoc migration runs (e.g., hotfixes, rollbacks), use `.github/workflows/migrate.yml`:

- **Trigger:** Manual via GitHub Actions UI (`workflow_dispatch`)
- **How to run:** GitHub repo → Actions → "Run Database Migrations" → Run workflow
- **Uses:** The currently deployed task definition

## Initial Setup Guide

### Prerequisites

- AWS CLI configured locally
- Docker Desktop running
- GitHub repository with Actions enabled
- Domain with DNS management access (e.g., Namecheap)

### Step 1: Create Secrets in AWS

#### Secrets Manager (Sensitive Data)

```bash
# DATABASE_URL - must be URL-encoded if password has special characters
# Format: postgresql://user:password@host:5432/database?sslmode=no-verify
aws secretsmanager create-secret \
  --name prod/monovra/database-url \
  --secret-string 'postgresql://postgres:URL_ENCODED_PASSWORD@monovra-db-prod.cc3ycyakou61.us-east-1.rds.amazonaws.com:5432/postgres?sslmode=no-verify'

# Better Auth Secret
aws secretsmanager create-secret \
  --name prod/monovra/better-auth-secret \
  --secret-string 'your-32-character-minimum-secret-key'
```

**Important:** If your database password contains special characters (`@`, `?`, `#`, etc.), URL-encode them:
```bash
node -e "console.log(encodeURIComponent('your-password'))"
```

#### Parameter Store (Non-Sensitive Config)

```bash
aws ssm put-parameter --name /monovra/prod/better-auth-url --type String --value "https://api.monovra.com"
aws ssm put-parameter --name /monovra/prod/cors-origin --type String --value "https://monovra.com"
aws ssm put-parameter --name /monovra/prod/database-pool-size --type String --value "10"
aws ssm put-parameter --name /monovra/prod/app-env --type String --value "production"
```

### Step 2: Create IAM Roles

#### ECS Task Execution Role

```bash
# Create role
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach managed policy
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Add secrets access (update ARNs with actual suffixes after creating secrets)
aws iam put-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-name MonovraSecretsAccess \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["secretsmanager:GetSecretValue"],
        "Resource": [
          "arn:aws:secretsmanager:us-east-1:283941296486:secret:prod/monovra/database-url-KbawNp",
          "arn:aws:secretsmanager:us-east-1:283941296486:secret:prod/monovra/better-auth-secret-zvQ4vZ"
        ]
      },
      {
        "Effect": "Allow",
        "Action": ["ssm:GetParameters", "ssm:GetParameter"],
        "Resource": ["arn:aws:ssm:us-east-1:283941296486:parameter/monovra/prod/*"]
      }
    ]
  }'
```

#### ECS Task Role

```bash
aws iam create-role \
  --role-name ecsTaskRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'
```

#### GitHub Actions User

```bash
# Create user
aws iam create-user --user-name github-actions-monovra

# Create access key (save the output!)
aws iam create-access-key --user-name github-actions-monovra

# Attach policy
aws iam put-user-policy \
  --user-name github-actions-monovra \
  --policy-name MonovraDeployPolicy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["ecr:GetAuthorizationToken"],
        "Resource": "*"
      },
      {
        "Effect": "Allow",
        "Action": [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ],
        "Resource": "arn:aws:ecr:us-east-1:283941296486:repository/prod-monovra-api"
      },
      {
        "Effect": "Allow",
        "Action": [
          "ecs:DescribeServices",
          "ecs:DescribeTaskDefinition",
          "ecs:DescribeTasks",
          "ecs:ListTasks",
          "ecs:RegisterTaskDefinition",
          "ecs:UpdateService",
          "ecs:RunTask"
        ],
        "Resource": "*"
      },
      {
        "Effect": "Allow",
        "Action": ["logs:GetLogEvents", "logs:FilterLogEvents", "logs:DescribeLogStreams"],
        "Resource": "arn:aws:logs:us-east-1:283941296486:log-group:/ecs/prod-monovra-api:*"
      },
      {
        "Effect": "Allow",
        "Action": "iam:PassRole",
        "Resource": [
          "arn:aws:iam::283941296486:role/ecsTaskExecutionRole",
          "arn:aws:iam::283941296486:role/ecsTaskRole"
        ]
      }
    ]
  }'
```

### Step 3: Create ECS Infrastructure

```bash
# CloudWatch Log Group
aws logs create-log-group --log-group-name /ecs/prod-monovra-api

# ECS Cluster
aws ecs create-cluster \
  --cluster-name prod-monovra-cluster \
  --capacity-providers FARGATE \
  --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1
```

### Step 4: Create Security Groups

```bash
# ECS Security Group
aws ec2 create-security-group \
  --group-name prod-monovra-api-sg \
  --description "Security group for Monovra API" \
  --vpc-id vpc-0347d329ae58f5de0

# Allow inbound on port 3000 from ALB
aws ec2 authorize-security-group-ingress \
  --group-id sg-00d8b446bca7ca405 \
  --protocol tcp \
  --port 3000 \
  --source-group sg-00ce8af78768e0c59

# Allow ECS to access RDS
aws ec2 authorize-security-group-ingress \
  --group-id sg-085597fe7d48abdb0 \
  --protocol tcp \
  --port 5432 \
  --source-group sg-00d8b446bca7ca405

# ALB Security Group
aws ec2 create-security-group \
  --group-name prod-monovra-alb-sg \
  --description "Security group for Monovra ALB" \
  --vpc-id vpc-0347d329ae58f5de0

# Allow HTTPS
aws ec2 authorize-security-group-ingress \
  --group-id sg-00ce8af78768e0c59 \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Allow HTTP (for redirect)
aws ec2 authorize-security-group-ingress \
  --group-id sg-00ce8af78768e0c59 \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0
```

### Step 5: Request SSL Certificate

```bash
# Request certificate
aws acm request-certificate \
  --domain-name api.monovra.com \
  --validation-method DNS \
  --region us-east-1

# Get DNS validation record
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:283941296486:certificate/4fa0ae51-258b-4ff0-9713-e90a334b5086 \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord'
```

Add the CNAME record to your DNS provider (Namecheap):
- **Host:** `_xxxxx.api` (value before `.monovra.com`)
- **Value:** `_xxxxx.jkddzztszm.acm-validations.aws.`

Wait for certificate status to become `ISSUED`:
```bash
aws acm describe-certificate --certificate-arn <ARN> --query 'Certificate.Status'
```

### Step 6: Create Application Load Balancer

```bash
# Create Target Group
aws elbv2 create-target-group \
  --name prod-monovra-api-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id vpc-0347d329ae58f5de0 \
  --target-type ip \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3

# Create ALB
aws elbv2 create-load-balancer \
  --name prod-monovra-alb \
  --subnets subnet-036208991a973a7ee subnet-03fb27e78fbf983d5 \
  --security-groups sg-00ce8af78768e0c59 \
  --scheme internet-facing \
  --type application

# Create HTTPS Listener
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:283941296486:loadbalancer/app/prod-monovra-alb/f59bc098d9fd9850 \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=arn:aws:acm:us-east-1:283941296486:certificate/4fa0ae51-258b-4ff0-9713-e90a334b5086 \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:283941296486:targetgroup/prod-monovra-api-tg/6d4777454441fd12

# Create HTTP Listener (redirect to HTTPS)
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:283941296486:loadbalancer/app/prod-monovra-alb/f59bc098d9fd9850 \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}'
```

### Step 7: Push Initial Docker Image

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 283941296486.dkr.ecr.us-east-1.amazonaws.com

# Build
docker build -t monovra-api .

# Tag
docker tag monovra-api:latest 283941296486.dkr.ecr.us-east-1.amazonaws.com/prod-monovra-api:latest

# Push
docker push 283941296486.dkr.ecr.us-east-1.amazonaws.com/prod-monovra-api:latest
```

### Step 8: Register Task Definition & Create Service

```bash
# Register task definition
aws ecs register-task-definition --cli-input-json file://.aws/task-definition.json

# Create service with ALB
aws ecs create-service \
  --cluster prod-monovra-cluster \
  --service-name prod-monovra-api-service \
  --task-definition prod-monovra-api \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-036208991a973a7ee,subnet-03fb27e78fbf983d5],securityGroups=[sg-00d8b446bca7ca405],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:us-east-1:283941296486:targetgroup/prod-monovra-api-tg/6d4777454441fd12,containerName=monovra-api,containerPort=3000"
```

### Step 9: Configure DNS

In Namecheap → **Advanced DNS**, add a CNAME record:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| CNAME | `api` | `prod-monovra-alb-1309997420.us-east-1.elb.amazonaws.com` | Automatic |

### Step 10: Configure GitHub Secrets

Go to GitHub repo → **Settings** → **Secrets and variables** → **Actions**

Add:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

### Step 11: Deploy

```bash
git push origin main
```

Monitor at: GitHub repo → **Actions** tab

## Operations

### Health Check

```bash
curl https://api.monovra.com/health
```

### View Logs

```bash
aws logs tail /ecs/prod-monovra-api --follow
```

### Check Service Status

```bash
aws ecs describe-services --cluster prod-monovra-cluster --services prod-monovra-api-service --query 'services[0].{runningCount:runningCount,desiredCount:desiredCount}'
```

### Force New Deployment

```bash
aws ecs update-service --cluster prod-monovra-cluster --service prod-monovra-api-service --force-new-deployment
```

### Scale Service

```bash
aws ecs update-service --cluster prod-monovra-cluster --service prod-monovra-api-service --desired-count 2
```

### Stop Service

```bash
aws ecs update-service --cluster prod-monovra-cluster --service prod-monovra-api-service --desired-count 0
```

### Run Migrations

**Via GitHub Actions (Recommended):**
```
GitHub repo → Actions → "Run Database Migrations" → Run workflow
```

**Manually via AWS CLI:**
```bash
aws ecs run-task \
  --cluster prod-monovra-cluster \
  --task-definition prod-monovra-api \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-036208991a973a7ee],securityGroups=[sg-00d8b446bca7ca405],assignPublicIp=ENABLED}" \
  --overrides '{"containerOverrides":[{"name":"monovra-api","command":["npm","run","migration:run:prod"]}]}'
```

### Check Target Group Health

```bash
aws elbv2 describe-target-health --target-group-arn arn:aws:elasticloadbalancing:us-east-1:283941296486:targetgroup/prod-monovra-api-tg/6d4777454441fd12
```

## Troubleshooting

### Task fails to start - Secrets error

**Error:** `ResourceInitializationError: unable to pull secrets`

**Fix:** Ensure the secret ARN in task definition includes the random suffix:
```bash
# Get full ARN
aws secretsmanager describe-secret --secret-id "prod/monovra/database-url" --query 'ARN' --output text
```

Update `.aws/task-definition.json` with full ARN including suffix.

### Database connection - searchParams error

**Error:** `Cannot read properties of undefined (reading 'searchParams')`

**Fix:** The DATABASE_URL secret value has extra quotes. Update without quotes:
```bash
aws secretsmanager put-secret-value \
  --secret-id "prod/monovra/database-url" \
  --secret-string 'postgresql://...'  # No quotes around the URL
```

### Database connection - no encryption

**Error:** `no pg_hba.conf entry for host ... no encryption`

**Fix:** Add `?sslmode=require` or `?sslmode=no-verify` to DATABASE_URL.

### Database connection - self-signed certificate

**Error:** `self-signed certificate in certificate chain`

**Fix:** Use `?sslmode=no-verify` in DATABASE_URL.

### SSL Certificate not working

**Error:** `SSL: no alternative certificate subject name matches`

**Fix:** Access the API via the domain name (`api.monovra.com`), not the ALB DNS name.

### Check Task Status

```bash
aws ecs describe-tasks --cluster prod-monovra-cluster --tasks $(aws ecs list-tasks --cluster prod-monovra-cluster --service-name prod-monovra-api-service --query 'taskArns[0]' --output text) --query 'tasks[0].{lastStatus:lastStatus,stoppedReason:stoppedReason}'
```

## File Structure

```
.aws/
└── task-definition.json      # ECS task definition

.github/
└── workflows/
    └── deploy.yml            # CI/CD pipeline

docs/
└── deployment/
    └── aws-ecs-deployment.md # This file
```

## Future Improvements

- [ ] Configure auto-scaling policies
- [ ] Add staging environment
- [ ] Set up CloudWatch alarms
- [ ] Implement blue/green deployments
- [ ] Add WAF for additional security
