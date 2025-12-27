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

    // Crear autorizador Cognito
    this.authorizer = new CognitoUserPoolsAuthorizer(this, 'SportShopAuthorizer', {
      cognitoUserPools: [props.authStack.userPool]
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

    // ENDPOINTS DEL CARRITO (requieren autenticación)
    const cartResource = this.api.root.addResource('cart');
    
    // GET /cart - Obtener carrito del usuario
    cartResource.addMethod('GET',
      new LambdaIntegration(props.computeStack.getCartFunction.function),
      {
        authorizationType: AuthorizationType.COGNITO,
        authorizer: this.authorizer
      }
    );
    
    // POST /cart - Agregar producto al carrito
    cartResource.addMethod('POST',
      new LambdaIntegration(props.computeStack.addToCartFunction.function),
      {
        authorizationType: AuthorizationType.COGNITO,
        authorizer: this.authorizer
      }
    );

    // DELETE /cart/{productId} - Eliminar producto del carrito
    const cartItemResource = cartResource.addResource('{productId}');
    cartItemResource.addMethod('DELETE',
      new LambdaIntegration(props.computeStack.removeFromCartFunction.function),
      {
        authorizationType: AuthorizationType.COGNITO,
        authorizer: this.authorizer
      }
    );

    // PUT /cart/{productId} - Actualizar cantidad en carrito
    cartItemResource.addMethod('PUT',
      new LambdaIntegration(props.computeStack.updateCartQuantityFunction.function),
      {
        authorizationType: AuthorizationType.COGNITO,
        authorizer: this.authorizer
      }
    );

    // ENDPOINTS DE PEDIDOS (requieren autenticación)
    const ordersResource = this.api.root.addResource('orders');
    
    // POST /orders - Crear pedido desde carrito
    ordersResource.addMethod('POST',
      new LambdaIntegration(props.computeStack.createOrderFunction.function),
      {
        authorizationType: AuthorizationType.COGNITO,
        authorizer: this.authorizer
      }
    );

    // GET /orders - Obtener pedidos del usuario
    ordersResource.addMethod('GET',
      new LambdaIntegration(props.computeStack.getUserOrdersFunction.function),
      {
        authorizationType: AuthorizationType.COGNITO,
        authorizer: this.authorizer
      }
    );

    // ENDPOINTS DE RESEÑAS (requieren autenticación)
    const reviewsResource = this.api.root.addResource('reviews');
    
    // POST /reviews - Crear reseña
    reviewsResource.addMethod('POST',
      new LambdaIntegration(props.computeStack.createReviewFunction.function),
      {
        authorizationType: AuthorizationType.COGNITO,
        authorizer: this.authorizer
      }
    );

    // ENDPOINTS DE ADMIN (requieren autenticación - IGUAL QUE CART)
    const adminResource = this.api.root.addResource('admin');
    
    // POST /admin/products - Crear producto (Admin)
    const adminProductsResource = adminResource.addResource('products');
    adminProductsResource.addMethod('POST',
      new LambdaIntegration(props.computeStack.createProductFunction.function),
      {
        authorizationType: AuthorizationType.COGNITO,
        authorizer: this.authorizer
      }
    );

    // PUT /admin/products/{id} - Actualizar producto (Admin)
    const adminProductDetailResource = adminProductsResource.addResource('{id}');
    adminProductDetailResource.addMethod('PUT',
      new LambdaIntegration(props.computeStack.updateProductFunction.function),
      {
        authorizationType: AuthorizationType.COGNITO,
        authorizer: this.authorizer
      }
    );

    // DELETE /admin/products/{id} - Eliminar producto (Admin)
    adminProductDetailResource.addMethod('DELETE',
      new LambdaIntegration(props.computeStack.deleteProductFunction.function),
      {
        authorizationType: AuthorizationType.COGNITO,
        authorizer: this.authorizer
      }
    );

    // Tags
    Object.entries(env.tags).forEach(([key, value]) => {
      Tags.of(this).add(key, value);
    });
  }
}