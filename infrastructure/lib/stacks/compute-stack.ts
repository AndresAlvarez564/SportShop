// Imports básicos de CDK
import { Stack, StackProps, Tags } from 'aws-cdk-lib';
import { Code } from 'aws-cdk-lib/aws-lambda';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

// Imports de nuestras configuraciones
import { getEnvironment } from '../config/environments';
import { SportShopLambda } from '../constructs/lambda-construct';

// Interface para las props del stack
interface ComputeStackProps extends StackProps {
  stage: string;
  productsTable: Table;
  cartTable: Table;
  ordersTable: Table;
  salesTable: Table;
  imagesBucket: Bucket;
}

// Clase principal del stack de compute
export class ComputeStack extends Stack {
  // Propiedades públicas para que otros stacks usen las funciones
  public readonly getProductsFunction: SportShopLambda;
  public readonly getProductDetailFunction: SportShopLambda;
  public readonly getProductsFilteredFunction: SportShopLambda;
  public readonly addToCartFunction: SportShopLambda;
  public readonly getCartFunction: SportShopLambda;
  public readonly removeFromCartFunction: SportShopLambda;
  public readonly updateCartQuantityFunction: SportShopLambda;
  public readonly createOrderFunction: SportShopLambda;
  public readonly createProductFunction: SportShopLambda;
  public readonly updateProductFunction: SportShopLambda;
  public readonly deleteProductFunction: SportShopLambda;
  public readonly generateUploadUrlFunction: SportShopLambda;
  public readonly completeOrderFunction: SportShopLambda;
  public readonly cancelOrderFunction: SportShopLambda;
  public readonly getAllOrdersFunction: SportShopLambda;
  public readonly getOrderDetailFunction: SportShopLambda;
  public readonly getAllSalesFunction: SportShopLambda;
  public readonly getSalesDetailFunction: SportShopLambda;
  public readonly updateSalesFunction: SportShopLambda;
  public readonly cancelSaleFunction: SportShopLambda;
  public readonly getSalesStatisticsFunction: SportShopLambda;

  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props);

    // Obtener configuración del ambiente
    const env = getEnvironment(props.stage);

    // Lambda function para obtener productos
    this.getProductsFunction = new SportShopLambda(this, 'GetProductsLambda', {
      functionName: `${env.prefix}-get-products`,
      code: Code.fromAsset('lambda-functions/get-products'),
      environment: {
        'PRODUCTS_TABLE': props.productsTable.tableName
      }
    });

    // Dar permisos a Lambda para leer DynamoDB
    props.productsTable.grantReadData(this.getProductsFunction.function);

    // Lambda function para obtener detalle de producto específico
    this.getProductDetailFunction = new SportShopLambda(this, 'GetProductDetailLambda', {
      functionName: `${env.prefix}-get-product-detail`,
      code: Code.fromAsset('lambda-functions/get-product-detail'),
      environment: {
        'PRODUCTS_TABLE': props.productsTable.tableName
      }
    });

    // Dar permisos a Lambda para leer DynamoDB
    props.productsTable.grantReadData(this.getProductDetailFunction.function);

    // Lambda function para filtrar productos por categoría y género
    this.getProductsFilteredFunction = new SportShopLambda(this, 'GetProductsFilteredLambda', {
      functionName: `${env.prefix}-get-products-filtered`,
      code: Code.fromAsset('lambda-functions/get-products-filtered'),
      environment: {
        'PRODUCTS_TABLE': props.productsTable.tableName
      }
    });

    // Dar permisos a Lambda para leer DynamoDB
    props.productsTable.grantReadData(this.getProductsFilteredFunction.function);

    // Lambda function para agregar productos al carrito (requiere autenticación)
    this.addToCartFunction = new SportShopLambda(this, 'AddToCartLambda', {
      functionName: `${env.prefix}-add-to-cart`,
      code: Code.fromAsset('lambda-functions/add-to-cart'),
      environment: {
        'PRODUCTS_TABLE': props.productsTable.tableName,
        'CART_TABLE': props.cartTable.tableName
      }
    });

    // Dar permisos a Lambda para leer productos y escribir en carrito
    props.productsTable.grantReadData(this.addToCartFunction.function);
    props.cartTable.grantReadWriteData(this.addToCartFunction.function);

    // Lambda function para obtener carrito del usuario
    this.getCartFunction = new SportShopLambda(this, 'GetCartLambda', {
      functionName: `${env.prefix}-get-cart`,
      code: Code.fromAsset('lambda-functions/get-cart'),
      environment: {
        'CART_TABLE': props.cartTable.tableName
      }
    });

    // Dar permisos a Lambda para leer carrito
    props.cartTable.grantReadData(this.getCartFunction.function);

    // Lambda function para eliminar productos del carrito
    this.removeFromCartFunction = new SportShopLambda(this, 'RemoveFromCartLambda', {
      functionName: `${env.prefix}-remove-from-cart`,
      code: Code.fromAsset('lambda-functions/remove-from-cart'),
      environment: {
        'CART_TABLE': props.cartTable.tableName
      }
    });

    // Dar permisos a Lambda para escribir en carrito
    props.cartTable.grantReadWriteData(this.removeFromCartFunction.function);

    // Lambda function para actualizar cantidad en carrito
    this.updateCartQuantityFunction = new SportShopLambda(this, 'UpdateCartQuantityLambda', {
      functionName: `${env.prefix}-update-cart-quantity`,
      code: Code.fromAsset('lambda-functions/update-cart-quantity'),
      environment: {
        'CART_TABLE': props.cartTable.tableName,
        'PRODUCTS_TABLE': props.productsTable.tableName
      }
    });

    // Dar permisos a Lambda para leer productos y escribir en carrito
    props.productsTable.grantReadData(this.updateCartQuantityFunction.function);
    props.cartTable.grantReadWriteData(this.updateCartQuantityFunction.function);

    // === LAMBDAS DE PEDIDOS ===
    
    // Lambda function para crear pedidos desde carrito
    this.createOrderFunction = new SportShopLambda(this, 'CreateOrderLambda', {
      functionName: `${env.prefix}-create-order`,
      code: Code.fromAsset('lambda-functions/create-order'),
      environment: {
        'CART_TABLE': props.cartTable.tableName,
        'ORDERS_TABLE': props.ordersTable.tableName,
        'PRODUCTS_TABLE': props.productsTable.tableName
      }
    });

    // Dar permisos para leer carrito y productos, escribir pedidos
    props.cartTable.grantReadWriteData(this.createOrderFunction.function);
    props.ordersTable.grantWriteData(this.createOrderFunction.function);
    props.productsTable.grantReadData(this.createOrderFunction.function);

    // === LAMBDAS DE ADMIN ===
    
    // Lambda function para crear productos (admin)
    this.createProductFunction = new SportShopLambda(this, 'CreateProductLambda', {
      functionName: `${env.prefix}-create-product`,
      code: Code.fromAsset('lambda-functions/create-product'),
      environment: {
        'PRODUCTS_TABLE': props.productsTable.tableName,
        'FORCE_UPDATE': 'v3' // Force CDK to detect changes
      }
    });

    // Dar permisos para leer y escribir productos
    props.productsTable.grantReadWriteData(this.createProductFunction.function);

    // Lambda function para actualizar productos (admin)
    this.updateProductFunction = new SportShopLambda(this, 'UpdateProductLambda', {
      functionName: `${env.prefix}-update-product`,
      code: Code.fromAsset('lambda-functions/update-product'),
      environment: {
        'PRODUCTS_TABLE': props.productsTable.tableName
      }
    });

    // Dar permisos para leer y escribir productos
    props.productsTable.grantReadWriteData(this.updateProductFunction.function);

    // Lambda function para eliminar productos (admin)
    this.deleteProductFunction = new SportShopLambda(this, 'DeleteProductLambda', {
      functionName: `${env.prefix}-delete-product`,
      code: Code.fromAsset('lambda-functions/delete-product'),
      environment: {
        'PRODUCTS_TABLE': props.productsTable.tableName,
        'CART_TABLE': props.cartTable.tableName
      }
    });

    // Dar permisos para leer y escribir productos y carrito
    props.productsTable.grantReadWriteData(this.deleteProductFunction.function);
    props.cartTable.grantReadWriteData(this.deleteProductFunction.function);

    // === LAMBDA PARA UPLOAD DE IMÁGENES ===
    
    // Lambda function para generar presigned URLs de S3 (soporta una o múltiples imágenes)
    this.generateUploadUrlFunction = new SportShopLambda(this, 'GenerateUploadUrlLambda', {
      functionName: `${env.prefix}-generate-upload-url`,
      code: Code.fromAsset('lambda-functions/generate-upload-url'),
      environment: {
        'IMAGES_BUCKET': props.imagesBucket.bucketName,
        'PRODUCT_IMAGES_BUCKET': props.imagesBucket.bucketName
      }
    });

    // Dar permisos para generar presigned URLs de S3
    props.imagesBucket.grantPut(this.generateUploadUrlFunction.function);

    // === LAMBDAS DE GESTIÓN DE PEDIDOS (ADMIN) ===
    
    // Lambda function para completar pedido (admin) - Marca como vendido y reduce stock
    this.completeOrderFunction = new SportShopLambda(this, 'CompleteOrderLambda', {
      functionName: `${env.prefix}-complete-order`,
      code: Code.fromAsset('lambda-functions/complete-order'),
      environment: {
        'ORDERS_TABLE': props.ordersTable.tableName,
        'SALES_TABLE': props.salesTable.tableName,
        'PRODUCTS_TABLE': props.productsTable.tableName
      }
    });

    // Dar permisos para leer/escribir pedidos, crear ventas, actualizar productos
    props.ordersTable.grantReadWriteData(this.completeOrderFunction.function);
    props.salesTable.grantWriteData(this.completeOrderFunction.function);
    props.productsTable.grantReadWriteData(this.completeOrderFunction.function);

    // Lambda function para cancelar pedido (admin) - Elimina pedido sin afectar stock
    this.cancelOrderFunction = new SportShopLambda(this, 'CancelOrderLambda', {
      functionName: `${env.prefix}-cancel-order`,
      code: Code.fromAsset('lambda-functions/cancel-order'),
      environment: {
        'ORDERS_TABLE': props.ordersTable.tableName
      }
    });

    // Dar permisos para leer/escribir pedidos
    props.ordersTable.grantReadWriteData(this.cancelOrderFunction.function);

    // === FUNCIONES ADICIONALES DE GESTIÓN DE PEDIDOS (ADMIN) ===
    
    // Lambda function para obtener todos los pedidos (admin)
    this.getAllOrdersFunction = new SportShopLambda(this, 'GetAllOrdersLambda', {
      functionName: `${env.prefix}-get-all-orders`,
      code: Code.fromAsset('lambda-functions/get-all-orders'),
      environment: {
        'ORDERS_TABLE': props.ordersTable.tableName
      }
    });

    // Dar permisos para leer pedidos
    props.ordersTable.grantReadData(this.getAllOrdersFunction.function);

    // Lambda function para obtener detalle de pedido específico (admin)
    this.getOrderDetailFunction = new SportShopLambda(this, 'GetOrderDetailLambda', {
      functionName: `${env.prefix}-get-order-detail`,
      code: Code.fromAsset('lambda-functions/get-order-detail'),
      environment: {
        'ORDERS_TABLE': props.ordersTable.tableName
      }
    });

    // Dar permisos para leer pedidos
    props.ordersTable.grantReadData(this.getOrderDetailFunction.function);

    // === FUNCIONES DE SALES (ADMIN) ===
    
    // Lambda function para obtener todas las ventas (admin)
    this.getAllSalesFunction = new SportShopLambda(this, 'GetAllSalesLambda', {
      functionName: `${env.prefix}-get-all-sales`,
      code: Code.fromAsset('lambda-functions/get-all-sales'),
      environment: {
        'SALES_TABLE': props.salesTable.tableName
      }
    });

    // Dar permisos para leer ventas
    props.salesTable.grantReadData(this.getAllSalesFunction.function);

    // Lambda function para obtener detalle de venta específica (admin)
    this.getSalesDetailFunction = new SportShopLambda(this, 'GetSalesDetailLambda', {
      functionName: `${env.prefix}-get-sales-detail`,
      code: Code.fromAsset('lambda-functions/get-sales-detail'),
      environment: {
        'SALES_TABLE': props.salesTable.tableName
      }
    });

    // Dar permisos para leer ventas
    props.salesTable.grantReadData(this.getSalesDetailFunction.function);

    // Lambda function para actualizar información de ventas (admin)
    this.updateSalesFunction = new SportShopLambda(this, 'UpdateSalesLambda', {
      functionName: `${env.prefix}-update-sales`,
      code: Code.fromAsset('lambda-functions/update-sales'),
      environment: {
        'SALES_TABLE': props.salesTable.tableName,
        'PRODUCTS_TABLE': props.productsTable.tableName
      }
    });

    // Dar permisos para leer/escribir ventas y productos
    props.salesTable.grantReadWriteData(this.updateSalesFunction.function);
    props.productsTable.grantReadData(this.updateSalesFunction.function);

    // Lambda function para cancelar venta y restaurar stock (admin)
    this.cancelSaleFunction = new SportShopLambda(this, 'CancelSaleLambda', {
      functionName: `${env.prefix}-cancel-sale`,
      code: Code.fromAsset('lambda-functions/cancel-sale'),
      environment: {
        'SALES_TABLE': props.salesTable.tableName,
        'PRODUCTS_TABLE': props.productsTable.tableName
      }
    });

    // Dar permisos para leer/escribir ventas y productos
    props.salesTable.grantReadWriteData(this.cancelSaleFunction.function);
    props.productsTable.grantReadWriteData(this.cancelSaleFunction.function);

    // Lambda function para estadísticas de ventas (admin)
    this.getSalesStatisticsFunction = new SportShopLambda(this, 'GetSalesStatisticsLambda', {
      functionName: `${env.prefix}-get-sales-statistics`,
      code: Code.fromAsset('lambda-functions/get-sales-statistics'),
      environment: {
        'SALES_TABLE': props.salesTable.tableName
      }
    });

    // Dar permisos para leer ventas
    props.salesTable.grantReadData(this.getSalesStatisticsFunction.function);

    // Aplicar tags
    Object.entries(env.tags).forEach(([key, value]) => {
      Tags.of(this).add(key, value);
    });
  }
}
