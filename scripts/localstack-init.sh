#!/bin/bash
set -e

echo "Initializing LocalStack services..."

# Wait for LocalStack to be ready
until awslocal s3 ls 2>&1 | grep -q 'BucketName' || [ $? -eq 0 ]; do
  echo "Waiting for LocalStack to be ready..."
  sleep 2
done

# Create S3 bucket for file uploads
echo "Creating S3 bucket..."
awslocal s3 mb s3://todomaster-test-bucket --region us-east-1 || true
awslocal s3api put-bucket-cors --bucket todomaster-test-bucket --cors-configuration '{
  "CORSRules": [{
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }]
}'

# Create SNS topics for notifications
echo "Creating SNS topics..."
awslocal sns create-topic --name todomaster-notifications --region us-east-1 || true
awslocal sns create-topic --name todomaster-alerts --region us-east-1 || true

# Create SQS queues for background jobs
echo "Creating SQS queues..."
awslocal sqs create-queue --queue-name todomaster-jobs --region us-east-1 || true
awslocal sqs create-queue --queue-name todomaster-dlq --region us-east-1 || true

# Set queue attributes for DLQ
awslocal sqs set-queue-attributes \
  --queue-url http://localhost:4566/000000000000/todomaster-jobs \
  --attributes '{
    "RedrivePolicy": "{\"deadLetterTargetArn\":\"arn:aws:sqs:us-east-1:000000000000:todomaster-dlq\",\"maxReceiveCount\":3}",
    "MessageRetentionPeriod": "1209600"
  }'

# Create test user for SES
echo "Configuring SES..."
awslocal ses verify-email-identity --email-address noreply@todomaster-test.com --region us-east-1 || true
awslocal ses verify-email-identity --email-address test@example.com --region us-east-1 || true

echo "LocalStack services initialized successfully!"