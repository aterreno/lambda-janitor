import * as aws from '@pulumi/aws'
import * as pulumi from '@pulumi/pulumi'

const role = new aws.iam.Role(`janitor-lambda-role`, {
    assumeRolePolicy: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'sts:AssumeRole',
          Principal: {
            Service: 'lambda.amazonaws.com',
          },
          Effect: 'Allow',
        },
      ],
    },
    tags: {},
  })

  const policy = new aws.iam.Policy(`janitor-lambda-policy`, {
    policy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
          Resource: `*`,
        },
        {
            Effect: 'Allow',
            Action: ['lambda:*'],
            Resource: `*`,
          },
      ],
    }),
  })

  new aws.iam.RolePolicyAttachment(`janitor-lambda-role-policy`, {
    role,
    policyArn: policy.arn,
  })

const func = new aws.lambda.Function('lambda-janitor', {
    name: `lambda-janitor`,
    role: role.arn,
    runtime: 'nodejs14.x',
    handler: 'bundle.clean',
    timeout: 300,
    memorySize: 512,
    description: 'A lambda to cleanup the AWS Lambda deployment packages',
    environment: {
      variables: {
        NODE_OPTIONS: '--enable-source-maps',        
      },
    },
    tags: {},
    code: new pulumi.asset.AssetArchive({
      bundle: new pulumi.asset.FileArchive('../dist/lambdaJanitor'),
    })    
  })

  aws.cloudwatch.onSchedule(
    `lambda-janitor-schedule`,
    `cron(0 6 ? * MON *)`,
    func,
  )  

export = func