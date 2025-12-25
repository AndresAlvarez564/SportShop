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
}

// Clase principal del stack de compute
export class ComputeStack extends Stack {
  // Propiedades públicas para que otros stacks usen las funciones
  public readonly getProductsFunction: SportShopLambda;

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

    // Aplicar tags
    Object.entries(env.tags).forEach(([key, value]) => {
      Tags.of(this).add(key, value);
    });
  }
}
