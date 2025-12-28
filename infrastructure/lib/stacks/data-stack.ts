// Imports básicos de CDK
import { Stack, StackProps, Tags } from 'aws-cdk-lib';
import { Table, AttributeType } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

// Imports de nuestras configuraciones
import { DYNAMODB_CONFIG } from '../config/constants';
import { getEnvironment } from '../config/environments';

// Interface para las props del stack (incluye el stage)
interface DataStackProps extends StackProps {
  stage: string;
}

// Clase principal del stack de datos
export class DataStack extends Stack {
  // Propiedades públicas para que otros stacks puedan usar las tablas
  public readonly productsTable: Table;
  public readonly cartTable: Table;
  public readonly ordersTable: Table;
  public readonly salesTable: Table;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    // Obtener configuración del ambiente (dev/prod)
    const env = getEnvironment(props.stage);

    // Tabla Products con categorías (sort key)
    this.productsTable = new Table(this, 'ProductsTable', {
      tableName: `${env.prefix}-products`,
      partitionKey: { name: 'id', type: AttributeType.STRING },
      sortKey: { name: 'category', type: AttributeType.STRING },
      billingMode: DYNAMODB_CONFIG.billingMode
    });

    // Tabla Cart con productId (sort key)
    this.cartTable = new Table(this, 'CartTable', {
      tableName: `${env.prefix}-cart`,
      partitionKey: { name: 'userId', type: AttributeType.STRING },
      sortKey: { name: 'productId', type: AttributeType.STRING },
      billingMode: DYNAMODB_CONFIG.billingMode
    });

    // Tabla Orders con timestamp (sort key)
    this.ordersTable = new Table(this, 'OrdersTable', {
      tableName: `${env.prefix}-orders`,
      partitionKey: { name: 'orderId', type: AttributeType.STRING },
      sortKey: { name: 'createdAt', type: AttributeType.STRING },
      billingMode: DYNAMODB_CONFIG.billingMode
    });

    // Tabla Sales (pedidos completados/vendidos) con timestamp (sort key)
    this.salesTable = new Table(this, 'SalesTable', {
      tableName: `${env.prefix}-sales`,
      partitionKey: { name: 'saleId', type: AttributeType.STRING },
      sortKey: { name: 'completedAt', type: AttributeType.STRING },
      billingMode: DYNAMODB_CONFIG.billingMode
    });

    // Aplicar tags para control de costos
    Object.entries(env.tags).forEach(([key, value]) => {
      Tags.of(this).add(key, value);
    });
  }
}