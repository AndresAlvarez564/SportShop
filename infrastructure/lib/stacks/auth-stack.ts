import { Stack, StackProps, Tags, RemovalPolicy } from 'aws-cdk-lib';
import { UserPool, UserPoolClient, CfnUserPoolGroup, AccountRecovery } from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';
import { getEnvironment } from '../config/environments';

interface AuthStackProps extends StackProps {
  stage: string;
}

export class AuthStack extends Stack {
  public readonly userPool: UserPool;
  public readonly userPoolClient: UserPoolClient;
  public readonly adminGroup: CfnUserPoolGroup;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    const env = getEnvironment(props.stage);

    // User Pool
    this.userPool = new UserPool(this, 'SportShopUserPool', {
      userPoolName: `${env.prefix}-user-pool`,
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: AccountRecovery.EMAIL_ONLY,
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

    // Admin Group
    this.adminGroup = new CfnUserPoolGroup(this, 'AdminGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'admin',
      description: 'Administrators with full access to manage products and orders',
      precedence: 1
    });

    // Tags
    Object.entries(env.tags).forEach(([key, value]) => {
      Tags.of(this).add(key, value);
    });
  }
}