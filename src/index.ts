import { getCertificateFromS3 } from "./s3Service.js";
import { extractPublicKey, extractCommonName, generateRSAKeyPair, generateECCKeyPair, signData } from "./certificateService.js";
import { storeSignedPublicKey } from "./dynamoService.js";
import dotenv from 'dotenv';
dotenv.config();

export const handler = async (event: any) => {
	try {
		const bucketName = process.env.BUCKET_NAME || "default-bucket";
		const key = process.env.CERTIFICATE_KEY || "certificate.pem";
		const signingAlgorithm = process.env.SIGNING_ALGORITHM || "RSA";

		// Fetch certificate from S3
		const certPem = await getCertificateFromS3(bucketName, key);
		// Extract public key and common name
		const publicKey = extractPublicKey(certPem);
		const commonName = extractCommonName(certPem);

		let signedKey: string;
		//Choose between ECC and RSA - only used for testing to showcase both
		if (signingAlgorithm === "ECC") {
			const { privateKey: eccPrivateKey } = await generateECCKeyPair();
			signedKey = await signData(publicKey, eccPrivateKey, signingAlgorithm);
		} else {
			const { privateKey: rsaPrivateKey } = generateRSAKeyPair();
			signedKey = await signData(publicKey, rsaPrivateKey, signingAlgorithm);
		}
		console.log("publicKey", publicKey)
		console.log("signedkey", signedKey)
		await storeSignedPublicKey(commonName, signedKey);

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

	// Mock event for local testing
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
