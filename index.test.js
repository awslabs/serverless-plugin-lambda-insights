const AddLambdaInsights = require('./index');

test('addLambdaInsights associates latest ARN', () => {
  // arrange
  const serverless = createServerless('us-east-1');
  const plugin = new AddLambdaInsights(serverless);

  // act
  plugin.addLambdaInsights();

  // assert
  expect(plugin.serverless.service.functions.myFunction.layers)
      .toStrictEqual(['arn:aws:lambda:us-east-1:580247275435:layer:LambdaInsightsExtension:14']);
});

test('addLambdaInsights throws for unknown region', () => {
  // arrange
  const serverless = createServerless('not-a-region-1');
  const plugin = new AddLambdaInsights(serverless);

  // act
  const task = () => plugin.addLambdaInsights();

  // assert
  expect(task).toThrow(Error);
});

test('addLambdaInsights adds IAM policy', () => {
  // arrange
  const serverless = createServerless('us-east-1');
  const plugin = new AddLambdaInsights(serverless);

  // act
  plugin.addLambdaInsights();

  // assert
  expect(plugin.provider.iamManagedPolicies)
      .toStrictEqual(['arn:aws:iam::aws:policy/CloudWatchLambdaInsightsExecutionRolePolicy']);
});

const createServerless = (region) => {
  const provider = {
    getRegion: () => region,
    iamManagedPolicies: [],
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
