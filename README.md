# aws-lambda-cert-handler

This project is a Lambda function that interacts with AWS S3 to fetch a certificate, processes the certificate to extract public key and common name, signs the public key with an RSA private key, and writes the signed public key to DynamoDB.

## Setup

1. Clone this repository.
2. Install dependencies:

```bash
npm install

```
3. Set up environment variables - for testing purposes of this project
Create a .env file in the root of the project to configure your environment variables. For local development, you’ll need the following:

BUCKET_NAME=your-s3-bucket-name
DYNAMO_DB_TABLE=your-dynamodb-table-name
LOCAL_TEST=true/false
PASSPHRASE=your-passphrase
SIGNING_ALGORITHM=ECC/RSA
CERTIFICATE_KEY = certificate.pem

## To test locally
1. Generate a X.509 v3 certificate using OpenSSL
2. Copy contents to a new file named certificate.pem in /src
3. Install aws cli and follow setup instructions
https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
4. Install DynamoDb locally:
docker pull amazon/dynamodb-local
docker run -d -p 8000:8000 amazon/dynamodb-local
5. Create the DynamoDB table locally
aws dynamodb create-table \
    --table-name cert-table \
    --attribute-definitions AttributeName=HashKey,AttributeType=S \
    --key-schema AttributeName=HashKey,KeyType=HASH \
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --endpoint-url http://localhost:8000
6. Create a bucket with your chosen bucket name (store in .env) and upload certificate to the bucket
7. npx tsx src/index.ts 
8. Check if table is updated
aws dynamodb scan \
    --table-name cert-table \
    --endpoint-url http://localhost:8000

