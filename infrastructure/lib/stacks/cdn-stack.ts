import { Stack, StackProps, Tags, Duration, CfnOutput } from 'aws-cdk-lib';
import { 
  Distribution, 
  ViewerProtocolPolicy, 
  AllowedMethods,
  CachedMethods,
  CachePolicy,
  ResponseHeadersPolicy,
  PriceClass,
  HeadersFrameOption,
  HeadersReferrerPolicy,
  OriginProtocolPolicy
} from 'aws-cdk-lib/aws-cloudfront';
import { HttpOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { getEnvironment } from '../config/environments';

interface CdnStackProps extends StackProps {
  stage: string;
  websiteBucket: Bucket;
  adminBucket: Bucket;
}

export class CdnStack extends Stack {
  public readonly websiteDistribution: Distribution;
  public readonly adminDistribution: Distribution;

  constructor(scope: Construct, id: string, props: CdnStackProps) {
    super(scope, id, props);

    const env = getEnvironment(props.stage);

    // Para buckets con website hosting, no usamos OAI sino acceso directo al website endpoint

    // Política de cache personalizada para SPAs
    const spaCachePolicy = new CachePolicy(this, 'SPACachePolicy', {
      cachePolicyName: `${env.prefix}-spa-cache-policy`,
      comment: 'Cache policy optimized for Single Page Applications',
      defaultTtl: Duration.days(1),
      maxTtl: Duration.days(365),
      minTtl: Duration.seconds(0),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true
    });

    // Política de headers de respuesta para seguridad
    const securityHeadersPolicy = new ResponseHeadersPolicy(this, 'SecurityHeadersPolicy', {
      responseHeadersPolicyName: `${env.prefix}-security-headers`,
      comment: 'Security headers for web applications',
      securityHeadersBehavior: {
        contentTypeOptions: { override: true },
        frameOptions: { frameOption: HeadersFrameOption.DENY, override: true },
        referrerPolicy: { referrerPolicy: HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN, override: true },
        strictTransportSecurity: {
          accessControlMaxAge: Duration.seconds(31536000),
          includeSubdomains: true,
          preload: true,
          override: true
        }
      },
      customHeadersBehavior: {
        customHeaders: [
          {
            header: 'X-Robots-Tag',
            value: 'index, follow',
            override: true
          }
        ]
      }
    });

    // CloudFront Distribution para el Website Principal
    this.websiteDistribution = new Distribution(this, 'WebsiteDistribution', {
      comment: `${env.prefix} Website Distribution`,
      defaultRootObject: 'index.html',
      priceClass: PriceClass.PRICE_CLASS_100, // Solo US, Canada y Europa para reducir costos
      
      defaultBehavior: {
        origin: new HttpOrigin(props.websiteBucket.bucketWebsiteDomainName, {
          protocolPolicy: OriginProtocolPolicy.HTTP_ONLY // S3 website hosting solo soporta HTTP
        }),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: CachedMethods.CACHE_GET_HEAD_OPTIONS,
        cachePolicy: spaCachePolicy,
        responseHeadersPolicy: securityHeadersPolicy,
        compress: true
      },

      // Configuración para SPA routing (React Router)
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.minutes(5)
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.minutes(5)
        }
      ],

      // Comportamientos adicionales para assets estáticos
      additionalBehaviors: {
        '/assets/*': {
          origin: new HttpOrigin(props.websiteBucket.bucketWebsiteDomainName, {
            protocolPolicy: OriginProtocolPolicy.HTTP_ONLY
          }),
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
          cachedMethods: CachedMethods.CACHE_GET_HEAD,
          cachePolicy: CachePolicy.CACHING_OPTIMIZED,
          compress: true
        }
      }
    });

    // CloudFront Distribution para el Admin Panel
    this.adminDistribution = new Distribution(this, 'AdminDistribution', {
      comment: `${env.prefix} Admin Panel Distribution`,
      defaultRootObject: 'index.html',
      priceClass: PriceClass.PRICE_CLASS_100,
      
      defaultBehavior: {
        origin: new HttpOrigin(props.adminBucket.bucketWebsiteDomainName, {
          protocolPolicy: OriginProtocolPolicy.HTTP_ONLY // S3 website hosting solo soporta HTTP
        }),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: CachedMethods.CACHE_GET_HEAD_OPTIONS,
        cachePolicy: spaCachePolicy,
        responseHeadersPolicy: securityHeadersPolicy,
        compress: true
      },

      // Configuración para SPA routing (React Router)
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.minutes(5)
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.minutes(5)
        }
      ],

      // Comportamientos adicionales para assets estáticos
      additionalBehaviors: {
        '/assets/*': {
          origin: new HttpOrigin(props.adminBucket.bucketWebsiteDomainName, {
            protocolPolicy: OriginProtocolPolicy.HTTP_ONLY
          }),
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
          cachedMethods: CachedMethods.CACHE_GET_HEAD,
          cachePolicy: CachePolicy.CACHING_OPTIMIZED,
          compress: true
        }
      }
    });

    // Tags
    Object.entries(env.tags).forEach(([key, value]) => {
      Tags.of(this).add(key, value);
    });

    // Outputs para obtener las URLs de CloudFront
    new CfnOutput(this, 'WebsiteCloudFrontURL', {
      value: `https://${this.websiteDistribution.distributionDomainName}`,
      description: 'CloudFront URL for the main website',
      exportName: `${env.prefix}-website-cloudfront-url`
    });

    new CfnOutput(this, 'AdminCloudFrontURL', {
      value: `https://${this.adminDistribution.distributionDomainName}`,
      description: 'CloudFront URL for the admin panel',
      exportName: `${env.prefix}-admin-cloudfront-url`
    });
  }
}