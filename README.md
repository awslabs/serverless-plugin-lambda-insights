# serverless-plugin-lambda-insights

A Serverless Framework Plugin allowing to enable Lambda Insights

![npm](https://img.shields.io/npm/v/serverless-plugin-lambda-insights)
![npm](https://img.shields.io/npm/dw/serverless-plugin-lambda-insights)

Enables AWS Lambda Insights (https://aws.amazon.com/blogs/mt/introducing-cloudwatch-lambda-insights/) for the entire Serverless stack or individual functions.

## Why using Lambda Insights

> _CloudWatch Lambda Insights_ is a monitoring and troubleshooting solution for serverless applications running on AWS Lambda. The solution collects, aggregates, and summarizes system-level metrics including CPU time, memory, disk, and network. It also collects, aggregates, and summarizes diagnostic information such as cold starts and Lambda worker shutdowns to help you isolate issues with your Lambda functions and resolve them quickly.

![AWS Documentation Example](https://docs.aws.amazon.com/lambda/latest/dg/images/lambdainsights-multifunction-view.png)

---

## Getting started

### Installation

`npm install --save-dev serverless-plugin-lambda-insights`

add Plugin to your `serverless.yml` in the plugins section.

### Minimal Usage

Example `serverless.yml`:

```yaml
provider:
  name: aws

plugins:
  - serverless-plugin-lambda-insights

functions:
  hello:
    handler: handler.hello
    lambdaInsights: true
```

### Functionality

The plugin will enable Lambda Insights by adding a Lambda Layer ([see Layer Details and Versions](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Lambda-Insights-extension-versions.html)) and adding necessary permissions using the `arn:aws:iam::aws:policy/CloudWatchLambdaInsightsExecutionRolePolicy` as a AWS IAM Managed Policy.

You can check in your AWS Console:
go to AWS Lambda -> select your Lambda function -> Configuration tab -> Monitoring tools ->
"CloudWatch Lambda Insights".
If `lambdaInsights` validated to `true` for a function,
the checkbox will be checked.

### Usage

Example `serverless.yml`:

```yaml
service: your-great-sls-service

provider:
  name: aws
  stage: dev

plugins:
  - serverless-plugin-lambda-insights

functions:
  mainFunction: #inherits tracing settings from "provider"
    lambdaInsights: true #turns on Lambda Insights for this function
    handler: src/app/index.handler
  secondFunction: #inherits tracing settings from "provider"
    lambdaInsights: false #turns off Lambda Insights for this function, will overrule custom settings
    handler: src/app/index.handler

custom:
  lambdaInsights:
    defaultLambdaInsights: true #turn on Lambda Insights for all your function, if
    attachPolicy: false #explicitly disable auto attachment Managed Policy.
    lambdaInsightsVersion: 14 #specify the Layer Version
```

### Example

You can find an example in the example folder of this repository. Run it with the following comment.

`cd example; serverless deploy`

This will deploy a hallo-world Lambda function with Lambda Insights enables.

---

## Want to contribute?

This is your repo - just go head and create a pull request. See also [CONTRIBUTING] (CONTRIBUTING) for more introductions.

Some open Ideas and Tasks:

- [ ] Testing with Jest
- [x] Add Toggle for auto policy attachment
- [x] Add an example

---

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the [LICENSE](LICENSE) file.
