/** @type {import('@kode/core').DeployConfig} */
module.exports = {

  project: {
    name: 'test-app',
    // version: '1.0.0',        // default: reads from package.json
    // registry: 'ghcr.io/myorg', // default: Docker Hub
    dockerfile: './Dockerfile',
    buildContext: '.',
  },

  environments: {
    staging: {
      target: 'docker-desktop',
      port: 3006,
      // envFile: '.env.staging',
      restartPolicy: 'unless-stopped',
    },
  },

  // envVars: {
  //   required: ['DATABASE_URL', 'JWT_SECRET'],
  //   shared: { TZ: 'UTC' },
  //   staging: { NODE_ENV: 'staging', DATABASE_URL: process.env.STAGING_DB },
  //   production: { NODE_ENV: 'production', DATABASE_URL: process.env.PROD_DB },
  // },

  healthCheck: {
    endpoint: '/health',
    retries: 3,
    retryInterval: 10,
    startupGrace: 15,
  },

  hooks: {
    preBuild: [
      // 'npm test',
      // 'npm run lint',
    ],
    // postDeploy: {
    //   staging: ['npm run seed'],
    //   production: ['npm run migrate'],
    // },
  },

  cli: {
    defaultEnv: 'staging',
    confirmProduction: true,   // set false for CI/CD
    logLevel: 'info',
  },

};