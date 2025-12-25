#!/usr/bin/env node
// Entry point principal de la aplicación CDK

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DataStack } from '../lib/stacks/data-stack';

// Crear la aplicación CDK
const app = new cdk.App();

// Crear stack de datos para desarrollo
new DataStack(app, 'SportShop-Dev-Data', {
  stage: 'dev',
  env: {
    region: 'us-east-1',
    account: '851725386264',
  },
  description: 'SportShop DynamoDB tables for development environment - v2'
});

// Opcional: Stack para producción (comentado por ahora)
// new DataStack(app, 'SportShop-Prod-Data', {
//   stage: 'prod',
//   env: {
//     region: 'us-east-1',
//     account: '851725386264',
//   },
//   description: 'SportShop DynamoDB tables for production environment'
// });
