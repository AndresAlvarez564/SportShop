import { Stack, StackProps, Tags, RemovalPolicy, Duration } from 'aws-cdk-lib';
import { Bucket, BlockPublicAccess, HttpMethods, BucketPolicy } from 'aws-cdk-lib/aws-s3';
import { PolicyStatement, Effect, AnyPrincipal } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { getEnvironment } from '../config/environments';

interface StorageStackProps extends StackProps {
  stage: string;
}

export class StorageStack extends Stack {
  public readonly imagesBucket: Bucket;
  public readonly websiteBucket: Bucket;
  public readonly adminBucket: Bucket;

  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);

    const env = getEnvironment(props.stage);

    // S3 Bucket para imágenes de productos con acceso público
    this.imagesBucket = new Bucket(this, 'ProductImagesBucket', {
      bucketName: `${env.prefix}-product-images-v2`,
      
      // Permitir acceso público para imágenes de productos
      blockPublicAccess: new BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false
      }),
      
      // Configuración de CORS para uploads desde frontend
      cors: [
        {
          allowedHeaders: ['*'],
          allowedMethods: [
            HttpMethods.GET, 
            HttpMethods.PUT, 
            HttpMethods.POST, 
            HttpMethods.DELETE, 
            HttpMethods.HEAD
          ],
          allowedOrigins: ['*'], // En producción, especificar dominio exacto
          exposedHeaders: ['ETag'],
          maxAge: 3000
        }
      ],
      
      // Configuración de ciclo de vida (opcional)
      lifecycleRules: [
        {
          id: 'DeleteIncompleteMultipartUploads',
          abortIncompleteMultipartUploadAfter: Duration.days(1),
          enabled: true
        }
      ],
      
      // Política de eliminación (cuidado en producción)
      removalPolicy: props.stage === 'dev' ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN
    });

    // Política de bucket para acceso público de lectura (imágenes)
    const imagesBucketPolicy = new BucketPolicy(this, 'ProductImagesBucketPolicy', {
      bucket: this.imagesBucket
    });

    imagesBucketPolicy.document.addStatements(
      new PolicyStatement({
        sid: 'PublicReadGetObject',
        effect: Effect.ALLOW,
        principals: [new AnyPrincipal()],
        actions: ['s3:GetObject'],
        resources: [`${this.imagesBucket.bucketArn}/*`]
      })
    );

    // S3 Bucket para hosting de la página web
    this.websiteBucket = new Bucket(this, 'WebsiteBucket', {
      bucketName: `${env.prefix}-website-v2`,
      
      // Configuración para hosting estático
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html', // Para SPA routing
      
      // Permitir acceso público para la página web
      blockPublicAccess: new BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false
      }),
      
      // Política de eliminación (cuidado en producción)
      removalPolicy: props.stage === 'dev' ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN
    });

    // Política de bucket para acceso público de lectura (website)
    const websiteBucketPolicy = new BucketPolicy(this, 'WebsiteBucketPolicy', {
      bucket: this.websiteBucket
    });

    websiteBucketPolicy.document.addStatements(
      new PolicyStatement({
        sid: 'PublicReadGetObject',
        effect: Effect.ALLOW,
        principals: [new AnyPrincipal()],
        actions: ['s3:GetObject'],
        resources: [`${this.websiteBucket.bucketArn}/*`]
      })
    );

    // S3 Bucket para admin panel (separado y seguro)
    this.adminBucket = new Bucket(this, 'AdminBucket', {
      bucketName: `${env.prefix}-admin-v2`,
      
      // Configuración para hosting estático
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html', // Para SPA routing
      
      // Permitir acceso público para el admin panel
      blockPublicAccess: new BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false
      }),
      
      // Política de eliminación (cuidado en producción)
      removalPolicy: props.stage === 'dev' ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN
    });

    // Política de bucket para acceso público de lectura (admin)
    const adminBucketPolicy = new BucketPolicy(this, 'AdminBucketPolicy', {
      bucket: this.adminBucket
    });

    adminBucketPolicy.document.addStatements(
      new PolicyStatement({
        sid: 'PublicReadGetObject',
        effect: Effect.ALLOW,
        principals: [new AnyPrincipal()],
        actions: ['s3:GetObject'],
        resources: [`${this.adminBucket.bucketArn}/*`]
      })
    );

    // Tags
    Object.entries(env.tags).forEach(([key, value]) => {
      Tags.of(this).add(key, value);
    });
  }
}