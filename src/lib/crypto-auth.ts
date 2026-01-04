// Decentralized authentication using Web Crypto API

export interface KeyPair {
  privateKey: string;
  publicKey: string;
}

// Generate a new cryptographic key pair
export async function generateKeyPair(): Promise<KeyPair> {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign", "verify"]
  );

  const privateKeyBuffer = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  const publicKeyBuffer = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);

  const privateKey = bufferToBase64(privateKeyBuffer);
  const publicKey = bufferToBase64(publicKeyBuffer);

  return { privateKey, publicKey };
}

// Derive public key from private key
export async function derivePublicKey(privateKeyBase64: string): Promise<string> {
  try {
    const privateKeyBuffer = base64ToBuffer(privateKeyBase64);
    
    const privateKey = await window.crypto.subtle.importKey(
      "pkcs8",
      privateKeyBuffer,
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      true,
      ["sign"]
    );

    // Get the raw private key to extract the public key
    const jwk = await window.crypto.subtle.exportKey("jwk", privateKey);
    
    // Remove the private component to get public key
    delete jwk.d;
    jwk.key_ops = ["verify"];
    
    const publicKey = await window.crypto.subtle.importKey(
      "jwk",
      jwk,
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      true,
      ["verify"]
    );

    const publicKeyBuffer = await window.crypto.subtle.exportKey("spki", publicKey);
    return bufferToBase64(publicKeyBuffer);
  } catch (error) {
    throw new Error("Invalid private key format");
  }
}

// Sign a message with private key
export async function signMessage(privateKeyBase64: string, message: string): Promise<string> {
  const privateKeyBuffer = base64ToBuffer(privateKeyBase64);
  
  const privateKey = await window.crypto.subtle.importKey(
    "pkcs8",
    privateKeyBuffer,
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    false,
    ["sign"]
  );

  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  
  const signature = await window.crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: { name: "SHA-256" },
    },
    privateKey,
    data
  );

  return bufferToBase64(signature);
}

// Verify a signature with public key
export async function verifySignature(
  publicKeyBase64: string,
  message: string,
  signatureBase64: string
): Promise<boolean> {
  try {
    const publicKeyBuffer = base64ToBuffer(publicKeyBase64);
    const signatureBuffer = base64ToBuffer(signatureBase64);
    
    const publicKey = await window.crypto.subtle.importKey(
      "spki",
      publicKeyBuffer,
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      false,
      ["verify"]
    );

    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    
    return await window.crypto.subtle.verify(
      {
        name: "ECDSA",
        hash: { name: "SHA-256" },
      },
      publicKey,
      signatureBuffer,
      data
    );
  } catch {
    return false;
  }
}

// Helper functions
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
