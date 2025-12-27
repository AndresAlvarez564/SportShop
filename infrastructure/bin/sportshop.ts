#!/usr/bin/env node
// Entry point principal de la aplicación CDK

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DataStack } from '../lib/stacks/data-stack';
import { ComputeStack } from '../lib/stacks/compute-stack';
import { AuthStack } from '../lib/stacks/auth-stack';
import { ApiStack } from '../lib/stacks/api-stack';
import { StorageStack } from '../lib/stacks/storage-stack';

// Crear la aplicación CDK
const app = new cdk.App();

// Configurar RemovalPolicy para TODA la aplicación
app.node.setContext('@aws-cdk/core:defaultRemovalPolicy', 'destroy');

// Crear stack de datos para desarrollo
const dataStack = new DataStack(app, 'SportShop-Dev-Data', {
  stage: 'dev',
  env: {
    region: 'us-east-1',
    account: '851725386264',
  },
  description: 'SportShop DynamoDB tables for development environment - v2'
});

// Crear stack de storage para desarrollo
const storageStack = new StorageStack(app, 'SportShop-Dev-Storage', {
  stage: 'dev',
  env: {
    region: 'us-east-1',
    account: '851725386264',
  },
  description: 'SportShop S3 buckets for development environment'
});

// Crear stack de compute para desarrollo
const computeStack = new ComputeStack(app, 'SportShop-Dev-Compute', {
  stage: 'dev',
  productsTable: dataStack.productsTable,
  cartTable: dataStack.cartTable,
  ordersTable: dataStack.ordersTable,
  imagesBucket: storageStack.imagesBucket,
  env: {
    region: 'us-east-1',
    account: '851725386264',
  },
  description: 'SportShop Lambda functions for development environment'
});

// Crear stack de autenticación para desarrollo
const authStack = new AuthStack(app, 'SportShop-Dev-Auth', {
  stage: 'dev',
  env: {
    region: 'us-east-1',
    account: '851725386264',
  },
  description: 'SportShop Cognito User Pool for development environment'
});

// Crear stack de API para desarrollo
const apiStack = new ApiStack(app, 'SportShop-Dev-Api', {
  stage: 'dev',
  computeStack: computeStack,
  authStack: authStack,
  env: {
    region: 'us-east-1',
    account: '851725386264',
  },
  description: 'SportShop REST API Gateway for development environment'
});

// Agregar dependencias explícitas para orden de deployment
apiStack.addDependency(computeStack);
apiStack.addDependency(authStack);
computeStack.addDependency(dataStack);
computeStack.addDependency(storageStack);
