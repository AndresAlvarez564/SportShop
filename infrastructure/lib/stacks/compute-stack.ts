// Imports básicos de CDK
import { Stack, StackProps, Tags } from 'aws-cdk-lib';
import { Code } from 'aws-cdk-lib/aws-lambda';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

// Imports de nuestras configuraciones
import { getEnvironment } from '../config/environments';
import { SportShopLambda } from '../constructs/lambda-construct';

// Interface para las props del stack
interface ComputeStackProps extends StackProps {
  stage: string;
  productsTable: Table;
  cartTable: Table;
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

    // Aplicar tags
    Object.entries(env.tags).forEach(([key, value]) => {
      Tags.of(this).add(key, value);
    });
  }
}
