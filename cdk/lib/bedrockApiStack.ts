import { join } from 'path';
import { Construct } from 'constructs';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { AuthorizationType, CognitoUserPoolsAuthorizer, Cors, LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { CfnOutput, Duration, Stack, StackProps } from 'aws-cdk-lib';
import { AccountRecovery, OAuthScope, UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

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

    const chatbotLambda = new NodejsFunction(this, 'ChatbotFunction', {
      runtime: Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: join(__dirname, '../lambda/bedrock/main.ts'),
      memorySize: 256,
      timeout: Duration.seconds(300),
      bundling: {
        minify: true,
        sourceMap: true,
      },
      environment: {
        DEPLOYMENT_TIMESTAMP: new Date().toISOString(),
        VERSION: '1.0.0',
        BEDROCK_MODEL_ID: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
        MODEL_TEMPERATURE: '0.7',
        MODEL_TOP_P: '0.9',
        MODEL_MAX_TOKENS: '2000',
        SYSTEM_PROMPT: 'You are a helpful AI assistant.',
      },
    });

    // Add Bedrock permissions
    chatbotLambda.addToRolePolicy(
      new PolicyStatement({
        actions: [
          'bedrock:InvokeModel',
          'bedrock:InvokeModelWithResponseStream',
        ],
        resources: [`arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-5-sonnet-20240620-v1:0`],
      })
    );

    // Create API Gateway with streaming support
    const api = new RestApi(this, 'ChatbotApi', {
      restApiName: 'Chatbot API',
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
      },
    });

    // Create Cognito Authorizer
    const auth = new CognitoUserPoolsAuthorizer(this, 'ChatbotAuthorizer', {
      cognitoUserPools: [userPool],
    });

    // Create API Gateway endpoint with streaming configuration
    const chatEndpoint = api.root.addResource('chat');
    chatEndpoint.addMethod('POST', 
      new LambdaIntegration(chatbotLambda, {
        proxy: true,
        // Enable response streaming through API Gateway
        integrationResponses: [{
          statusCode: '200',
          responseParameters: {
            'method.response.header.Content-Type': "'text/plain'",
            'method.response.header.Transfer-Encoding': "'chunked'"
          }
        }]
      }), 
      {
        authorizer: auth,
        authorizationType: AuthorizationType.COGNITO,
        methodResponses: [{
          statusCode: '200',
          responseParameters: {
            'method.response.header.Content-Type': true,
            'method.response.header.Transfer-Encoding': true
          }
        }]
      }
    );

    // Output values
    new CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
    });

    new CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
    });

    new CfnOutput(this, 'ApiUrl', {
      value: api.url,
    });
  }
}
