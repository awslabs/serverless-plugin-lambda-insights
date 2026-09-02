const AddLambdaInsights = require('./index');

test('addLambdaInsights associates latest ARN', async () => {
  // arrange
  const serverless = createServerless('us-east-1');
  const plugin = new AddLambdaInsights(serverless);

  // act
  await plugin.addLambdaInsights();

  // assert
  expect(plugin.serverless.service.functions.myFunction.layers)
      .toStrictEqual(['arn:aws:lambda:us-east-1:580247275435:layer:LambdaInsightsExtension:35']);
});

test('generateLayerArn defaults to global provider architecture to associates latest ARN for Arm64', async () => {
  // arrange
  const serverless = createServerless('us-east-1');
  serverless.service.provider.architecture = 'arm64';
  const plugin = new AddLambdaInsights(serverless);

  // act
  await plugin.addLambdaInsights();

  // assert
  expect(plugin.serverless.service.functions.myFunction.layers)
      .toStrictEqual(['arn:aws:lambda:us-east-1:580247275435:layer:LambdaInsightsExtension-Arm64:2']);
});

test('generateLayerArn local function architecture overwrites global setting' +
    ' to associates latest ARN for Arm64', async () => {
  // arrange
  const serverless = createServerless('us-east-1');
  serverless.service.functions.myFunction.architecture = 'arm64';
  const plugin = new AddLambdaInsights(serverless);

  // act
  await plugin.addLambdaInsights();

  // assert
  expect(plugin.serverless.service.functions.myFunction.layers)
      .toStrictEqual(['arn:aws:lambda:us-east-1:580247275435:layer:LambdaInsightsExtension-Arm64:2']);
});

test('generateLayerArn supports multi architecture setting to associate latest ARN', async () => {
  // arrange
  const serverless = createServerless('us-east-1');
  serverless.service.functions.myArm64Function = {
    lambdaInsights: true,
    handler: 'handler.hello',
    architecture: 'arm64',
  };
  const plugin = new AddLambdaInsights(serverless);

  // act
  await plugin.addLambdaInsights();

  // assert
  expect(plugin.serverless.service.functions.myFunction.layers)
      .toStrictEqual(['arn:aws:lambda:us-east-1:580247275435:layer:LambdaInsightsExtension:35']);
  expect(plugin.serverless.service.functions.myArm64Function.layers)
      .toStrictEqual(['arn:aws:lambda:us-east-1:580247275435:layer:LambdaInsightsExtension-Arm64:2']);
});

test('addLambdaInsights associates correct explicit layer version', async () => {
  // arrange
  const serverless = createServerless('us-east-1', 12);
  const plugin = new AddLambdaInsights(serverless);

  // act
  await plugin.addLambdaInsights();

  // assert
  expect(plugin.serverless.service.functions.myFunction.layers)
      .toStrictEqual(['arn:aws:lambda:us-east-1:580247275435:layer:LambdaInsightsExtension:12']);
});

test('addLambdaInsights uses custom account when explicit version is set', async () => {
  // arrange
  const serverless = createServerless('us-east-1', 12, '123456789012');
  const plugin = new AddLambdaInsights(serverless);

  // act
  await plugin.addLambdaInsights();

  // assert
  expect(plugin.serverless.service.functions.myFunction.layers)
      .toStrictEqual(['arn:aws:lambda:us-east-1:123456789012:layer:LambdaInsightsExtension:12']);
});

test('addLambdaInsights throws for unknown region', async () => {
  // arrange
  const serverless = createServerless('not-a-region-1');
  const plugin = new AddLambdaInsights(serverless);

  // act
  const task = () => plugin.addLambdaInsights();

  await expect(task).rejects
      .toThrow('Unknown latest version for region \'not-a-region-1\'. ' +
   'Check the Lambda Insights documentation to get the list of currently supported versions.');
});

test('addLambdaInsights throws invalid lambdaInsightsVersion argument', async () => {
  // arrange
  const serverless = createServerless('us-east-1', 'some_wrong_version_number');
  const plugin = new AddLambdaInsights(serverless);

  // act
  const task = () => plugin.addLambdaInsights();

  // assert
  await expect(task)
      .toThrow('lambdaInsightsVersion version must be a number.');
});

test('addLambdaInsights throws invalid lambdaInsightsAccount argument', async () => {
  // arrange
  const serverless = createServerless('us-east-1', undefined, 12345);
  const plugin = new AddLambdaInsights(serverless);

  // act
  const task = () => plugin.addLambdaInsights();

  // assert
  await expect(task)
      .toThrow('lambdaInsightsAccount must be a string.');
});

test('addLambdaInsights throws for invalid region version combination', async () => {
  // arrange
  const serverless = createServerless('us-east-1', 55555);
  const plugin = new AddLambdaInsights(serverless);

  // act
  const task = () => plugin.addLambdaInsights();

  // assert
  await expect(task).rejects
      .toThrow('LambdaInsights layer version \'55555\' does not exist within your region \'us-east-1\'.');
});


test('addLambdaInsights adds IAM policy', async () => {
  // arrange
  const serverless = createServerless('us-east-1');
  const plugin = new AddLambdaInsights(serverless);

  // act
  await plugin.addLambdaInsights();

  // assert
  expect(plugin.service.provider.iamManagedPolicies)
      .toStrictEqual(['arn:aws:iam::aws:policy/CloudWatchLambdaInsightsExecutionRolePolicy']);
});


const createServerless = (region, LayerVersion, LambdaInsightsAccount) => {
  const awsProvider = {
    getRegion: () => region,
    request: async (service, method, param) => {
      // explicit layer version test is valid for version 12 with any account
      const arnPattern = new RegExp(
          `^arn:aws:lambda:${region}:\\d+:layer:LambdaInsightsExtension(-Arm64)?:12$`,
      );
      if (arnPattern.test(param.Arn)) {
        return {LayerVersionArn: param.Arn};
      } else {
        const customError = new Error();
        customError.code = 'AccessDeniedException';
        throw customError;
      }
    },
  };

  const lambdaInsightsConfig = {
    lambdaInsightsVersion: LayerVersion,
  };
  if (LambdaInsightsAccount !== undefined) {
    lambdaInsightsConfig.lambdaInsightsAccount = LambdaInsightsAccount;
  }

  return {
    getProvider: () => awsProvider,
    configSchemaHandler: {
      defineFunctionProperties: () => jest.fn(),
      defineCustomProperties: () => jest.fn(),
    },
    service: {
      provider: {
        name: 'aws',
        runtime: 'nodejs12.x',
        architecture: 'x86_64',
      },
      custom: {
        lambdaInsights: lambdaInsightsConfig,
      },
      functions: {
        myFunction: {
          lambdaInsights: true,
          handler: 'handler.hello',
        },
      },
    },
  };
};
