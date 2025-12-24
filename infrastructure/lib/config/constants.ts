// Imports CDK para Runtime de Lambda y BillingMode de DynamoDB
// Crear LAMBDA_CONFIG con Python 3.12, timeout 30s, memory 256MB
// Crear DYNAMODB_CONFIG con ON_DEMAND billing
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { BillingMode } from 'aws-cdk-lib/aws-dynamodb';

export const LAMBDA_CONFIG = {
  runtime: Runtime.PYTHON_3_10,
  timeout: 30,
  memorySize: 256
};

export const DYNAMODB_CONFIG = {
  billingMode: BillingMode.PAY_PER_REQUEST
};
