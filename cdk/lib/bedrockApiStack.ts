import { join } from 'path';
import { Construct } from 'constructs';
import { ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { CfnOutput,  RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { AccountRecovery, OAuthScope, UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import { AuthorizationType, Definition, GraphqlApi, MappingTemplate, SchemaFile } from 'aws-cdk-lib/aws-appsync'

export class AwsChatbotStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const userPool = new UserPool(this, 'ChatbotUserPool', {
      userPoolName: 'chatbot-user-pool',
      selfSignUpEnabled: false,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
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

    // Create Cognito User Pool Client
    const userPoolClient = new UserPoolClient(this, 'ChatbotUserPoolClient', {
      userPool,
      generateSecret: false,
      authFlows: {
        adminUserPassword: true,
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [OAuthScope.OPENID, OAuthScope.EMAIL, OAuthScope.PROFILE],
        callbackUrls: ['http://localhost:5173/callback'], // Update this with your actual callback URL
        logoutUrls: ['http://localhost:5173'], // Update this with your actual logout URL
      },
    });

    // Create Cognito User Pool Domain
    const domain = userPool.addDomain('CognitoDomain', {
      cognitoDomain: {
        domainPrefix: 'persochatta', // Choose a unique prefix
      },
    });

    const graphQl = new GraphqlApi(this, 'StreamingApi', {
      name: 'streaming-api',
      definition: Definition.fromFile(join(__dirname, 'schema.graphql')),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool:userPool
          }
        },
      },
      xrayEnabled: true,
    });

    const lambdaRole = new Role(this, 'LambdaRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    lambdaRole.addToPolicy(
      new PolicyStatement({
        actions: [
          'bedrock:InvokeModel',
          'bedrock:InvokeModelWithResponseStream',
        ],
        resources: [`arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-5-sonnet-20240620-v1:0`],
      })
    );

    lambdaRole.addToPolicy(
      new PolicyStatement({
        actions: [
          'appsync:PublishToStream',
        ],
        resources: [graphQl.arn],
      })
    );

    // Output values
    new CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
    });

    new CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
    });

    new CfnOutput(this, 'CognitoDomain', {
      value: domain.baseUrl(),
    });

  }
}