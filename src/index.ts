import { CertificateService } from "./certificateService.js";
import dotenv from 'dotenv';
import { AWSConstants, CertConstants } from '../Constants.js'
import { DynamoService } from "./dynamoService.js";
import { S3Service } from "./s3Service.js";
dotenv.config();


export const handler = async (event: any) => {
	try {
		const dynamoService = new DynamoService();
		const s3Service = new S3Service();
		const certificateService = new CertificateService();
		const bucketName = process.env.BUCKET_NAME || AWSConstants.BUCKET_NAME;
		const key = process.env.CERTIFICATE_KEY || AWSConstants.CERTIFICATE_KEY;
		const signingAlgorithm = process.env.SIGNING_ALGORITHM || CertConstants.DEFAULT_SIGNING_ALGORITHM;

		// Fetch certificate from S3
		const certPem = await s3Service.getCertificateFromS3(bucketName, key);
		// Extract public key and common name
		const publicKey = certificateService.extractPublicKey(certPem);
		const commonName = certificateService.extractCommonName(certPem);

		let signedKey: string;
		//Choose between ECC and RSA - only used for testing to showcase both
		if (signingAlgorithm === CertConstants.ECC_ALGORITHM) {
			const { privateKey: eccPrivateKey } = await certificateService.generateECCKeyPair();
			signedKey = await certificateService.signData(publicKey, eccPrivateKey, signingAlgorithm);
		} else {
			const { privateKey: rsaPrivateKey } = certificateService.generateRSAKeyPair();
			signedKey = await certificateService.signData(publicKey, rsaPrivateKey, signingAlgorithm);
		}

		await dynamoService.storeSignedPublicKey(commonName, signedKey);
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
};

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
		const result = await handler(mockEvent);
		console.log("Handler executed successfully:", result);
	} catch (error) {
		console.error("Handler execution failed:", error);
	}
})();
