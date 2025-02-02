import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';

const dynamoDb = new DynamoDBClient({
	region: 'us-east-1',
	endpoint: process.env.DYNAMODB_LOCAL_URL || "http://localhost:8000", // DynamoDB Local URL, only used for testing purposes
});

export const storeSignedPublicKey = async (hashKey: string, signedPublicKey: string): Promise<void> => {
	const params = {
		TableName: process.env.DYNAMODB_TABLE,
		Item: {
			HashKey: { S: hashKey },
			SignedPublicKey: { S: signedPublicKey },
		},
	};

	try {
		await dynamoDb.send(new PutItemCommand(params));
	} catch (error) {
		console.error('Error writing to DynamoDB:', error);
		throw new Error('Failed to write to DynamoDB');
	}
};
