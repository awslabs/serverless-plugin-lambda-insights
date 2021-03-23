'use strict';

// Lambda Insight Layer Versions
// see https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Lambda-Insights-extension-versions.html
const layerVersions = require('./layerVersions.json');

const layerArn = (region, version) => {
  if (version) {
    // TODO: this does not appropriately handle non 'aws' partitions
    return `arn:aws:lambda:${region}:580247275435:layer:LambdaInsightsExtension:${version}`;
  }

  const arn = layerVersions[region];
  if (!arn) {
    throw new Error(
        `Unknown latest version for region '${region}'. ` +
        `Check the Lambda Insights documentation to get the list of currently supported versions.`);
  }
  return arn;
};


const lambdaInsightsManagedPolicy = 'arn:aws:iam::aws:policy/CloudWatchLambdaInsightsExecutionRolePolicy';

/**
 * Serverless Lambda Insights Plugin - serverless-plugin-lambda-insights
 * @class AddLambdaInsights
 */
class AddLambdaInsights {
  /**
   * AddLambdaInsights constructor
   * This class gets instantiated with a serverless object and a bunch of options.
   * @param  {object} serverless The serverless instance which enables access to global service config during
   */
  constructor(serverless) {
    this.serverless = serverless;
    this.service = this.serverless.service;
    this.provider = this.serverless.getProvider('aws');

    this.hooks = {
      'before:package:setupProviderConfiguration': this.addLambdaInsights.bind(this),
    };

    serverless.configSchemaHandler.defineFunctionProperties('aws', {
      properties: {
        lambdaInsights: {type: 'boolean'},
      },
    });

    serverless.configSchemaHandler.defineCustomProperties({
      properties: {
        lambdaInsights: {
          defaultLambdaInsights: {type: 'boolean'},
          attachPolicy: {type: 'boolean'},
          lambdaInsightsVersion: {type: 'number'},
        },
      },
    });
  }

  /**
   * Check if Lambda Insights parameter is of type Boolean
   * @param  {any} value Value to check
   * @return {boolean} return input value if boolean
   */
  checkLambdaInsightsType(value) {
    if (typeof value === 'boolean') {
      return value;
    } else {
      throw new Error(
          'LambdaInsights and DefaultLambdaInsights values must be set to either true or false.',
      );
    }
  }

  /**
   * Check if Lambda Insights Layer Version is valid
   * @param  {any} value Value to check
   * @return {boolean} return input value if available
   */
  checkLambdaInsightsVersion(value) {
    if (typeof value === 'number') {
      return value;
    } else {
      throw new Error(`LambdaInsightsVersion must be a number.`);
    }
  }

  /**
   * Attach Lambda Layer conditionally to each function
   * @param  {boolean} globalLambdaInsights global settings
   * @param  {number} layerVersion global layerVersion settings
   * @param  {boolean} attachPolicy global attachPolicy settings
   */
  addLambdaInsightsToFunctions(globalLambdaInsights, layerVersion, attachPolicy) {
    if (typeof this.service.functions !== 'object') {
      return;
    }

    let policyToggle = false;
    Object.keys(this.service.functions).forEach((functionName) => {
      const fn = this.service.functions[functionName];
      const localLambdaInsights = fn.hasOwnProperty('lambdaInsights') ?
        this.checkLambdaInsightsType(fn.lambdaInsights) :
        null;

      if (
        localLambdaInsights === false ||
        (localLambdaInsights === null && globalLambdaInsights === null)
      ) {
        return;
      }

      const fnLambdaInsights = localLambdaInsights || globalLambdaInsights;

      if (fnLambdaInsights) {
        // attach Lambda Layer
        fn.layers = fn.layers || [];
        fn.layers.push(
            layerArn(
                this.provider.getRegion(),
                layerVersion,
            ),
        );
        policyToggle = true;
      }
    });
    if (attachPolicy && policyToggle) {
      // attach CloudWatchLambdaInsightsExecutionRolePolicy
      this.service.provider.iamManagedPolicies =
        this.service.provider.iamManagedPolicies || [];
      this.service.provider.iamManagedPolicies.push(lambdaInsightsManagedPolicy);
    }
  }

  /**
   * Hook function to get global config value and executes addLambdaInsightsToFunctions
   */
  addLambdaInsights() {
    const customLambdaInsights =
      this.service.custom && this.service.custom.lambdaInsights;

    const globalLambdaInsights =
      customLambdaInsights && customLambdaInsights.defaultLambdaInsights ?
        this.checkLambdaInsightsType(
            customLambdaInsights.defaultLambdaInsights,
        ) :
        null;

    const attachPolicy =
      customLambdaInsights && customLambdaInsights.hasOwnProperty('attachPolicy') ?
        this.checkLambdaInsightsType(
            customLambdaInsights.attachPolicy,
        ) :
        true;

    const layerVersion =
      customLambdaInsights && customLambdaInsights.lambdaInsightsVersion ?
        this.checkLambdaInsightsVersion(
            customLambdaInsights.lambdaInsightsVersion,
        ) :
        null;

    this.addLambdaInsightsToFunctions(globalLambdaInsights, layerVersion, attachPolicy);
  }
}

module.exports = AddLambdaInsights;
