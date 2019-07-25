import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import route53 = require('@aws-cdk/aws-route53');
import { Duration } from '@aws-cdk/core';

export class EC2BasicsStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Using default vpc
    const vpc = ec2.Vpc.fromLookup(this, 'VPC', {
      isDefault: true
    });

    // Open port 22 for SSH connection from anywhere
    const mySecurityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc,
      securityGroupName: "my-test-sg",
      description: 'Allow ssh access to ec2 instances from anywhere',
      allowAllOutbound: true 
    });

    const rules = [
      ec2.Port.icmpPing(),
      ec2.Port.tcp(22),
    ];

    for (const rule of rules) {
      mySecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), rule);
    }

    // We are using the latest AMAZON LINUX AMI
    const awsAMI = new ec2.AmazonLinuxImage({generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2});


    // We define instance details here
    const ec2Instance = new ec2.CfnInstance(this, "test-instance", {
      imageId: awsAMI.getImage(this).imageId,
      instanceType: "t2.micro",
      monitoring: false,
      tags: [
        {"key": "Name", "value": "test-instance"}
      ],
      networkInterfaces: [
        {
          deviceIndex: "0",
          associatePublicIpAddress: true,
          subnetId: vpc.publicSubnets[0].subnetId,
          groupSet: [mySecurityGroup.securityGroupId]
        }
      ]
    })

    let myDomain = 'taylorm.net'

    const zone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: myDomain,
      privateZone: false
    });

    new route53.RecordSet(this, 'Basic', {
      zone,
      recordName: 'test' + '.' + myDomain,
      recordType: route53.RecordType.A,
      target: route53.AddressRecordTarget.fromIpAddresses(ec2Instance.attrPublicIp),
      ttl: Duration.seconds(60)
    });
  }
}

const app = new cdk.App();
new EC2BasicsStack(app, "EC2BasicsStack", {
    env: {
        region: process.env.AWS_REGION,
        account: process.env.ACCOUNT_ID
    }
});