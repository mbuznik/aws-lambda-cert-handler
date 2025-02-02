import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { AWSConstants } from '../Constants';
export class DynamoService {
	private dynamoDb: DynamoDBClient;
	constructor() {
		this.dynamoDb = this.chooseDynamoDBClient();
	}

	private chooseDynamoDBClient(): DynamoDBClient {
		let dynamoDB: DynamoDBClient;
		if (process.env.LOCAL_TEST === "true") {
			dynamoDB = new DynamoDBClient({
				region: AWSConstants.AWS_DEFAULT_REGION,
				endpoint: process.env.DYNAMODB_LOCAL_URL, // Only use for local testing DynamoDB
			});
		} else {
			dynamoDB = new DynamoDBClient({});
		}
		return dynamoDB;
	}


	async storeSignedPublicKey(hashKey: string, signedPublicKey: string): Promise<void> {
		const params = {
			TableName: process.env.DYNAMODB_TABLE!,
			Item: {
				CommonName: { S: hashKey },
				SignedPublicKey: { S: signedPublicKey },
			},
		};

		try {
			await this.dynamoDb.send(new PutItemCommand(params));
		} catch (error) {
			console.error('Error writing to DynamoDB:', error);
			throw new Error('Failed to write to DynamoDB');
		}
	}
}



