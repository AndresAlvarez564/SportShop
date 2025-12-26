import { Stack, StackProps, Tags, RemovalPolicy } from 'aws-cdk-lib';
import { UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';
import { getEnvironment } from '../config/environments';

interface AuthStackProps extends StackProps {
  stage: string;
}

export class AuthStack extends Stack {
  public readonly userPool: UserPool;
  public readonly userPoolClient: UserPoolClient;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    const env = getEnvironment(props.stage);

    // User Pool
    this.userPool = new UserPool(this, 'SportShopUserPool', {
      userPoolName: `${env.prefix}-user-pool`,
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      removalPolicy: RemovalPolicy.DESTROY
    });

    // User Pool Client
    this.userPoolClient = new UserPoolClient(this, 'SportShopUserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: `${env.prefix}-user-pool-client`,
      generateSecret: false,
      authFlows: {
        adminUserPassword: true,
        userPassword: true,
        userSrp: true
      }
    });

    // Tags
    Object.entries(env.tags).forEach(([key, value]) => {
      Tags.of(this).add(key, value);
    });
  }
}