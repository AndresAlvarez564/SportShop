// Environment configurations for different stages

export interface Environment {
  name: string;
  prefix: string;
  stage: string;
  tags: { [key: string]: string };
}

export const ENVIRONMENTS: { [key: string]: Environment } = {
  dev: {
    name: 'development',
    prefix: 'sportshop-dev',
    stage: 'dev',
    tags: {
      Environment: 'dev',
      Project: 'sportshop',
      Owner: 'Andres',
      CostCenter: 'learning',
      Component: 'development'
    }
  },
  prod: {
    name: 'production',
    prefix: 'sportshop-prod',
    stage: 'prod',
    tags: {
      Environment: 'prod',
      Project: 'sportshop',
      Owner: 'Andres',
      CostCenter: 'learning',
      Component: 'production'
    }
  }
};

export const getEnvironment = (stage: string): Environment => {
  return ENVIRONMENTS[stage] || ENVIRONMENTS.dev;
};