import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { AWSConstants } from '../Constants';

function chooseDynamoDBClient() {
	let dynamoDB: DynamoDBClient;
	if (process.env.LOCAL_TEST === "true") {
		dynamoDB = new DynamoDBClient({
			region: AWSConstants.AWS_DEFAULT_REGION,
			endpoint: process.env.DYNAMODB_LOCAL_URL //Only use for locally testing dynamoDB
		});
	} else {
		dynamoDB = new DynamoDBClient({});
	}
	return dynamoDB
}


export const storeSignedPublicKey = async (hashKey: string, signedPublicKey: string): Promise<void> => {
	const dynamoDbClient = chooseDynamoDBClient();
	const params = {
		TableName: process.env.DYNAMODB_TABLE,
		Item: {
			CommonName: { S: hashKey },
			SignedPublicKey: { S: signedPublicKey },
		},	
	};

	try {
		await dynamoDbClient.send(new PutItemCommand(params));
	} catch (error) {
		console.error('Error writing to DynamoDB:', error);
		throw new Error('Failed to write to DynamoDB');
	}
};
