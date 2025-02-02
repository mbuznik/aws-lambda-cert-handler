import { GetObjectCommand, NoSuchKey, S3Client, S3ServiceException } from "@aws-sdk/client-s3"
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { AWSConstants, CertConstants } from "../Constants";

dotenv.config();
export class S3Service {
	private s3Client: S3Client;

	constructor() {
		this.s3Client = new S3Client({});
	}

	// Function to read the certificate from the local file system
	private async getLocalCertificate(): Promise<string> {
		const certName = process.env.CERTIFICATE_KEY || AWSConstants.CERTIFICATE_KEY;
		const currentDir = path.dirname(new URL(import.meta.url).pathname);
		const certificatePath = path.resolve(currentDir, certName);

		try {
			return fs.readFileSync(certificatePath, CertConstants.DEFAULT_ENCODING);
		} catch (error) {
			console.error('Error reading certificate file:', error);
			throw new Error('Failed to read certificate file');
		}
	}

	// Function to get the certificate from an S3 bucket
	private async getS3Certificate(bucketName: string, key: string): Promise<string> {
		console.log("Reading certificate from S3 bucket...", process.env.BUCKET_NAME);

		try {
			const response = await this.s3Client.send(
				new GetObjectCommand({
					Bucket: process.env.BUCKET_NAME || "default-bucket",
					Key: key,
				})
			);
			if (!response.Body) {
				throw new Error(`S3 object "${key}" is empty or not accessible.`);
			}

			const certificatePem = await response.Body.transformToString();
			console.log("Successfully read certificate from S3 with key:", key);
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

	// Main function to fetch the certificate, either from local or S3
	public async getCertificateFromS3(bucketName: string, key: string): Promise<string> {
		if (process.env.LOCAL_TEST === "true") {
			return this.getLocalCertificate();
		} else {
			return this.getS3Certificate(bucketName, key);
		}
	}
}

