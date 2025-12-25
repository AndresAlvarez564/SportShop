// Construct reutilizable para crear Lambdas con configuración estándar
import { Construct } from 'constructs';
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import { Duration } from 'aws-cdk-lib';
import { LAMBDA_CONFIG } from '../config/constants';

export interface SportShopLambdaProps {
  functionName: string;
  handler?: string;
  code: Code;
  environment?: { [key: string]: string };
  timeout?: Duration;
  memorySize?: number;
}

export class SportShopLambda extends Construct {
  public readonly function: Function;

  constructor(scope: Construct, id: string, props: SportShopLambdaProps) {
    super(scope, id);

    // Crear Lambda con configuración estándar del proyecto
    this.function = new Function(this, 'Function', {
      functionName: props.functionName,
      runtime: LAMBDA_CONFIG.runtime,
      timeout: props.timeout || Duration.seconds(LAMBDA_CONFIG.timeout),
      memorySize: props.memorySize || LAMBDA_CONFIG.memorySize,
      handler: props.handler || 'index.handler',
      code: props.code,
      environment: props.environment || {}
    });
  }
}
