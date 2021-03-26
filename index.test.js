const AddLambdaInsights = require('./index');

test('addLambdaInsights associates latest ARN', async () => {
  // arrange
  const serverless = createServerless('us-east-1');
  const plugin = new AddLambdaInsights(serverless);

  // act
  await plugin.addLambdaInsights();

  // assert
  expect(plugin.serverless.service.functions.myFunction.layers)
      .toStrictEqual(['arn:aws:lambda:us-east-1:580247275435:layer:LambdaInsightsExtension:14']);
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
  expect(plugin.provider.iamManagedPolicies)
      .toStrictEqual(['arn:aws:iam::aws:policy/CloudWatchLambdaInsightsExecutionRolePolicy']);
});


const createServerless = (region, LayerVersion) => {
  const provider = {
    getRegion: () => region,
    iamManagedPolicies: [],
    request: async (service, method, param) => {
      // explicit layer version test is only valid for version 12
      if (param.Arn===`arn:aws:lambda:${region}:580247275435:layer:LambdaInsightsExtension:12`) {
        return {LayerVersionArn: param.Arn};
      } else {
        const customError = new Error();
        customError.code = 'AccessDeniedException';
        throw customError;
      }
    },
  };
  return {
    getProvider: () => provider,
    configSchemaHandler: {
      defineFunctionProperties: () => jest.fn(),
      defineCustomProperties: () => jest.fn(),
    },
    service: {
      provider,
      custom: {
        lambdaInsights: {
          lambdaInsightsVersion: LayerVersion,
        },
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

