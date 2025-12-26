import { Stack, StackProps, Tags } from 'aws-cdk-lib';
import { RestApi, LambdaIntegration, Cors, AuthorizationType, CognitoUserPoolsAuthorizer } from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import { getEnvironment } from '../config/environments';
import { ComputeStack } from './compute-stack';
import { AuthStack } from './auth-stack';

interface ApiStackProps extends StackProps {
  stage: string;
  computeStack: ComputeStack;
  authStack: AuthStack;
}

export class ApiStack extends Stack {
  public readonly api: RestApi;
  public readonly authorizer: CognitoUserPoolsAuthorizer;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const env = getEnvironment(props.stage);

    // Crear REST API
    this.api = new RestApi(this, 'SportShopApi', {
      restApiName: `${env.prefix}-api`,
      description: 'SportShop E-commerce REST API',
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization']
      }
    });

    // ENDPOINTS PÚBLICOS DE PRODUCTOS
    // GET /products - Obtener todos los productos
    const productsResource = this.api.root.addResource('products');
    productsResource.addMethod('GET', 
      new LambdaIntegration(props.computeStack.getProductsFunction.function)
    );

    // GET /products/filter - Filtrar productos por categoría/género
    const productsFilterResource = productsResource.addResource('filter');
    productsFilterResource.addMethod('GET',
      new LambdaIntegration(props.computeStack.getProductsFilteredFunction.function)
    );

    // GET /products/{id} - Obtener producto específico
    const productDetailResource = productsResource.addResource('{id}');
    productDetailResource.addMethod('GET',
      new LambdaIntegration(props.computeStack.getProductDetailFunction.function)
    );

    // GET /products/{id}/reviews - Obtener reseñas del producto
    const productReviewsResource = productDetailResource.addResource('reviews');
    productReviewsResource.addMethod('GET',
      new LambdaIntegration(props.computeStack.getProductReviewsFunction.function)
    );

    // Tags
    Object.entries(env.tags).forEach(([key, value]) => {
      Tags.of(this).add(key, value);
    });
  }
}