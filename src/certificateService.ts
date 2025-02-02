import forge from "node-forge";
import crypto, { KeyPairSyncResult } from "crypto";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { AWSConstants, CertConstants } from "../Constants";

export interface RSAKeyPair {
  publicKey: forge.pki.PublicKey;
  privateKey: forge.pki.PrivateKey;
}

export function extractPublicKey(certPem: string) {
  const cert = forge.pki.certificateFromPem(certPem);
  return cert.publicKey;
}

export function extractCommonName(certPem: string): string {
  const cert = forge.pki.certificateFromPem(certPem);
  return cert.subject.getField("CN").value;
}

export function generateRSAKeyPair(): RSAKeyPair {
  const keyPair = forge.pki.rsa.generateKeyPair(2048);
  return { privateKey: keyPair.privateKey, publicKey: keyPair.publicKey };
}

async function getECCPassphraseSecret(): Promise<string> {
  const secret_name = AWSConstants.ECC_PASSPHRASE_AWS_SECRET_NAME;
  const client = new SecretsManagerClient({
    region: AWSConstants.AWS_DEFAULT_REGION,
  });
  let response;
  try {
    response = await client.send(
      new GetSecretValueCommand({
        SecretId: secret_name,
        VersionStage: "AWSCURRENT",
      })
    );
  } catch (error) {
    throw error;
  }
  const secret = response.SecretString;
  console.log("Secret ", secret)
  if (!secret) {
    throw new Error("Failed to retrieve passphrase secret");
  }
  return secret;
}

export async function generateECCKeyPair(): Promise<KeyPairSyncResult<string, string>> {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'secp256k1',
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase: await getECCPassphraseSecret() || process.env.PASSPHRASE
    },
  });

  return {
    publicKey: publicKey,
    privateKey: privateKey,
  };

}

export async function signData(publicKey: any, privateKey: any, algorithm: string): Promise<string> {
  const sign = crypto.createSign("SHA256");

  if (algorithm === CertConstants.ECC_ALGORITHM) {
    const passphrase = await getECCPassphraseSecret() || process.env.PASSPHRASE;
    try {
      console.log("Private key before decryption:", privateKey);
      const decryptedPrivateKey = crypto.createPrivateKey({
        key: privateKey,
        passphrase: passphrase, // Decrypt using the passphrase
      });
      sign.update(forge.pki.publicKeyToPem(publicKey), CertConstants.DEFAULT_ENCODING);
      return sign.sign(decryptedPrivateKey, 'base64');
    } catch (err) {
      console.error("Error decrypting and signing the private key:", err);
      throw new Error("Failed to decrypt and sign private key for ECC.");
    }
  } else if (algorithm === CertConstants.RSA_ALGORITHM) {
    const pemPublicKey = forge.pki.publicKeyToPem(publicKey);
    sign.update(pemPublicKey, CertConstants.DEFAULT_ENCODING);
    const pemPrivateKey = forge.pki.privateKeyToPem(privateKey);
    return sign.sign(pemPrivateKey, 'base64');
  } else {
    throw new Error("Unsupported signing algorithm");
  }
}


