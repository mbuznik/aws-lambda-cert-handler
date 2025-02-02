import { GetObjectCommand, NoSuchKey, S3Client, S3ServiceException } from "@aws-sdk/client-s3"
const s3Client = new S3Client({})
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv'
dotenv.config();

export async function getCertificateFromS3(bucketName: string, key: string): Promise<string> {
	if (process.env.LOCAL_TEST === "true") {
		// Reading local file for testing purposes only
		const certName = process.env.CERTIFICATE_KEY || "certificate.pem"
		const currentDir = path.dirname(new URL(import.meta.url).pathname);
		const certificatePath = path.resolve(currentDir, certName);
		try {
			const certPem = fs.readFileSync(certificatePath, 'utf8');
			return certPem;
		} catch (error) {
			console.error('Error reading certificate file:', error);
			throw new Error('Failed to read certificate file');
		}
	} else {
		console.log("Reading certificate from S3 bucket...", process.env.BUCKET_NAME)
		try {
			const response = await s3Client.send(
				new GetObjectCommand({
					Bucket: process.env.BUCKET_NAME || "default-bucket",
					Key: key,
				})
			);
			if (!response.Body) {
				throw new Error(`S3 object "${key}" is empty or not accessible.`);
			}

			const certificatePem = await response.Body.transformToString();
			console.log("Successfully read certificate from s3 with key:", key)
			return certificatePem;
		} catch (caught) {
			if (caught instanceof NoSuchKey) {
				console.error(`Error: No such key "${key}" exists in the bucket "${bucketName}".`);
			} else if (caught instanceof S3ServiceException) {
				console.error(
					`Error from S3 while getting object from "${bucketName}". ${caught.name}: ${caught.message}`
				);
			} else {
				throw caught;
			}
			throw new Error('Failed to retrieve certificate from S3');
		}
	}
};


