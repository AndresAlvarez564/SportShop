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

    // POST /admin/upload-url - Generar presigned URL para upload (Admin)
    const adminUploadResource = adminResource.addResource('upload-url');
    adminUploadResource.addMethod('POST',
      new LambdaIntegration(props.computeStack.generateUploadUrlFunction.function),
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

    // ENDPOINTS DE GESTIÓN DE PEDIDOS (ADMIN)
    const adminOrdersResource = adminResource.addResource('orders');
    
    // GET /admin/orders - Obtener todos los pedidos (Admin)
    adminOrdersResource.addMethod('GET',
      new LambdaIntegration(props.computeStack.getAllOrdersFunction.function),
      {
        authorizationType: AuthorizationType.COGNITO,
        authorizer: this.authorizer
      }
    );
    
    // GET /admin/orders/{orderId} - Obtener detalle de pedido específico (Admin)
    const adminOrderDetailResource = adminOrdersResource.addResource('{orderId}');
    adminOrderDetailResource.addMethod('GET',
      new LambdaIntegration(props.computeStack.getOrderDetailFunction.function),
      {
        authorizationType: AuthorizationType.COGNITO,
        authorizer: this.authorizer
      }
    );
    
    // PUT /admin/orders/{orderId}/complete - Completar pedido (Admin)
    const adminCompleteOrderResource = adminOrderDetailResource.addResource('complete');
    adminCompleteOrderResource.addMethod('PUT',
      new LambdaIntegration(props.computeStack.completeOrderFunction.function),
      {
        authorizationType: AuthorizationType.COGNITO,
        authorizer: this.authorizer
      }
    );

    // DELETE /admin/orders/{orderId} - Cancelar pedido (Admin)
    adminOrderDetailResource.addMethod('DELETE',
      new LambdaIntegration(props.computeStack.cancelOrderFunction.function),
      {
        authorizationType: AuthorizationType.COGNITO,
        authorizer: this.authorizer
      }
    );

    // ENDPOINTS DE VENTAS (ADMIN)
    const adminSalesResource = adminResource.addResource('sales');
    
    // GET /admin/sales - Obtener todas las ventas (Admin)
    adminSalesResource.addMethod('GET',
      new LambdaIntegration(props.computeStack.getAllSalesFunction.function),
      {
        authorizationType: AuthorizationType.COGNITO,
        authorizer: this.authorizer
      }
    );

    // GET /admin/sales/statistics - Obtener estadísticas de ventas (Admin)
    const adminSalesStatsResource = adminSalesResource.addResource('statistics');
    adminSalesStatsResource.addMethod('GET',
      new LambdaIntegration(props.computeStack.getSalesStatisticsFunction.function),
      {
        authorizationType: AuthorizationType.COGNITO,
        authorizer: this.authorizer
      }
    );

    // GET /admin/sales/{saleId} - Obtener detalle de venta específica (Admin)
    const adminSaleDetailResource = adminSalesResource.addResource('{saleId}');
    adminSaleDetailResource.addMethod('GET',
      new LambdaIntegration(props.computeStack.getSalesDetailFunction.function),
      {
        authorizationType: AuthorizationType.COGNITO,
        authorizer: this.authorizer
      }
    );

    // PUT /admin/sales/{saleId} - Actualizar información de venta (Admin)
    adminSaleDetailResource.addMethod('PUT',
      new LambdaIntegration(props.computeStack.updateSalesFunction.function),
      {
        authorizationType: AuthorizationType.COGNITO,
        authorizer: this.authorizer
      }
    );

    // DELETE /admin/sales/{saleId} - Cancelar venta y restaurar stock (Admin)
    adminSaleDetailResource.addMethod('DELETE',
      new LambdaIntegration(props.computeStack.cancelSaleFunction.function),
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