# SportShop Infrastructure

AWS CDK Infrastructure for SportShop E-commerce Platform

## Structure

- `bin/` - Entry point
- `lib/stacks/` - Stack definitions by domain
- `lib/config/` - Environment configurations
- `lib/constructs/` - Reusable components

## Commands

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript
cdk synth           # Generate CloudFormation
cdk deploy          # Deploy to AWS
```

## Stacks

- **DataStack** - DynamoDB tables
- **ComputeStack** - Lambda functions
- **ApiStack** - API Gateway
- **FrontendStack** - S3 + CloudFront
- **AuthStack** - Cognito User Pools