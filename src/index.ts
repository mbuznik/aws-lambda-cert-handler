import { CertificateService } from "./certificateService.js";
import dotenv from 'dotenv';
import { AWSConstants, CertConstants } from '../Constants.js'
import { DynamoService } from "./dynamoService.js";
import { S3Service } from "./s3Service.js";
dotenv.config();

export class LambdaHandler {
	private dynamoService: DynamoService;
	private s3Service: S3Service;
	private certificateService: CertificateService;

	constructor() {
		this.dynamoService = new DynamoService();
		this.s3Service = new S3Service();
		this.certificateService = new CertificateService();
	}
	public async handle(event: any) {
		try {
			const bucketName = process.env.BUCKET_NAME || AWSConstants.BUCKET_NAME;
			const key = process.env.CERTIFICATE_KEY || AWSConstants.CERTIFICATE_KEY;
			const signingAlgorithm = process.env.SIGNING_ALGORITHM || CertConstants.DEFAULT_SIGNING_ALGORITHM;

			// Fetch certificate from S3
			const certPem = await this.s3Service.getCertificateFromS3(bucketName, key);
			// Extract public key and common name
			const publicKey = this.certificateService.extractPublicKey(certPem);
			const commonName = this.certificateService.extractCommonName(certPem);

			let signedKey: string;
			//Choose between ECC and RSA - only used for testing to showcase both
			if (signingAlgorithm === CertConstants.ECC_ALGORITHM) {
				const { privateKey: eccPrivateKey } = await this.certificateService.generateECCKeyPair();
				signedKey = await this.certificateService.signData(publicKey, eccPrivateKey, signingAlgorithm);
			} else {
				const { privateKey: rsaPrivateKey } = this.certificateService.generateRSAKeyPair();
				signedKey = await this.certificateService.signData(publicKey, rsaPrivateKey, signingAlgorithm);
			}

			await this.dynamoService.storeSignedPublicKey(commonName, signedKey);
			return {
				statusCode: 200,
				body: JSON.stringify("Signed public key stored successfully.")
			};
		} catch (err) {
			console.error("Error:", err);
			return {
				statusCode: 500,
				body: JSON.stringify("Error processing the certificate.")
			};
		}
	}

}
// Using this for local testing, will be removed for prod #TODO
(async () => {
	console.log("Running handler...");
	const mockEvent = {
		Records: [
			{
				s3: {
					bucket: { name: process.env.BUCKET_NAME },
					object: { key: process.env.CERTIFICATE_KEY }
				}
			}
		]
	};
	try {
		const lambdaHandler = new LambdaHandler();
		const result = await lambdaHandler.handle(mockEvent);
		console.log("Handler executed successfully:", result);
	} catch (error) {
		console.error("Handler execution failed:", error);
	}
})();
