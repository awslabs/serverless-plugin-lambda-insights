'use strict';

// Lambda Insight Layer Versions
// see https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Lambda-Insights-extension-versions.html
const layerVersions = require('./layerVersions.json');
const layerVersionsArm64 = require('./layerVersionsArm64.json');

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
    if (this.checkValidationSupport(serverless)) {
      serverless.configSchemaHandler.defineFunctionProperties('aws', {
        properties: {
          lambdaInsights: {type: 'boolean'},
        },
      });

      serverless.configSchemaHandler.defineCustomProperties({
        properties: {
          lambdaInsights: {
            type: 'object',
            properties: {
              defaultLambdaInsights: {type: 'boolean'},
              attachPolicy: {type: 'boolean'},
              lambdaInsightsVersion: {type: 'number'},
            }
          },
        },
      });
    }
  }

  /**
   * Validates serverless object has required validation fields
   * @param {any} serverless
   * @return {boolean} Whether installed serverless fw supports validation
   */
  checkValidationSupport(serverless) {
    return serverless.configSchemaHandler &&
             serverless.configSchemaHandler.defineFunctionProperties &&
             typeof serverless.configSchemaHandler['defineFunctionProperties'] == 'function' &&
             serverless.configSchemaHandler.defineCustomProperties &&
             typeof serverless.configSchemaHandler['defineCustomProperties'] == 'function';
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
      throw new Error('lambdaInsightsVersion version must be a number.');
    }
  }

  /**
   * Generates a valid Lambda Insights Layer ARN for your Region
   * @param  {number} version Value to check
   * @return {string} Lambda Insights Layer ARN
   */
  async generateLayerARN(version, architecture) {
    const region = this.provider.getRegion();
    const isArm64 = architecture ? architecture === 'arm64' : this.service.provider.architecture === 'arm64';
    if (version) {
      try {
        let layerVersionInfo;
        if (isArm64) {
          layerVersionInfo = await this.provider.request('Lambda', 'getLayerVersionByArn', {
            Arn: `arn:aws:lambda:${region}:580247275435:layer:LambdaInsightsExtension-Arm64:${version}`,
          });
        } else {
          layerVersionInfo = await this.provider.request('Lambda', 'getLayerVersionByArn', {
            Arn: `arn:aws:lambda:${region}:580247275435:layer:LambdaInsightsExtension:${version}`,
          });
        }
        return layerVersionInfo.LayerVersionArn;
      } catch (err) {
        if (err.code==='AccessDeniedException') {
          throw new Error(
              `LambdaInsights layer version '${version}' ` +
            `does not exist within your region '${region}'.`);
        } else {
          throw err;
        }
      }
    }

    let arn;
    if (isArm64) {
      arn = layerVersionsArm64[region];
    } else {
      arn = layerVersions[region];
    }
    if (!arn) {
      throw new Error(
          `Unknown latest version for region '${region}'. ` +
          `Check the Lambda Insights documentation to get the list of currently supported versions.`);
    }
    return arn;
  };

  /**
   * Attach Lambda Layer conditionally to each function
   * @param  {boolean} globalLambdaInsights global settings
   * @param  {number} layerVersion global layerVersion settings
   * @param  {boolean} attachPolicy global attachPolicy settings
   */
  async addLambdaInsightsToFunctions(globalLambdaInsights, layerVersion, attachPolicy) {
    if (typeof this.service.functions !== 'object') {
      return;
    }
    try {

      let policyToggle = false;
      const functions = Object.keys(this.service.functions);
      for (const functionName of functions) {
        const fn = this.service.functions[functionName];
        const layerARN = await this.generateLayerARN(layerVersion, fn.architecture);
        const localLambdaInsights = fn.hasOwnProperty('lambdaInsights') ?
          this.checkLambdaInsightsType(fn.lambdaInsights) :
          null;

        if (
          localLambdaInsights === false ||
          (localLambdaInsights === null && globalLambdaInsights === null)
        ) {
          continue;
        }

        const fnLambdaInsights = localLambdaInsights || globalLambdaInsights;

        if (fnLambdaInsights) {
          // attach Lambda Layer
          fn.layers = fn.layers || [];
          fn.layers.push(layerARN);
          policyToggle = true;
        }
      };
      if (attachPolicy && policyToggle) {
      // attach CloudWatchLambdaInsightsExecutionRolePolicy
        this.service.provider.iamManagedPolicies =
        this.service.provider.iamManagedPolicies || [];
        this.service.provider.iamManagedPolicies.push(lambdaInsightsManagedPolicy);
      }
      return;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Hook function to get global config value and executes addLambdaInsightsToFunctions
   * @return {Promise} Lambda Insights Layer ARN
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

    return this.addLambdaInsightsToFunctions(globalLambdaInsights, layerVersion, attachPolicy);
  }
}

module.exports = AddLambdaInsights;
