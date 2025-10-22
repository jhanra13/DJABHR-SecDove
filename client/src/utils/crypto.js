// Web Crypto API utilities for E2EE implementation
// Following Phase 2.1, 2.2, 2.3 of implementation plan

// Convert ArrayBuffer to hex string
export function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Convert hex string to ArrayBuffer
export function hexToBuffer(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes.buffer;
}

// ============= Phase 2.1: Key Management =============

// Generate RSA-OAEP key pair (2048-bit, SHA-256)
export async function generateKeyPair() {
  return await window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

// Generate random salt (16 bytes)
export function generateSalt() {
  const salt = new Uint8Array(16);
  window.crypto.getRandomValues(salt);
  return bufferToHex(salt);
}

// Export public key to SPKI format
export async function exportPublicKey(publicKey) {
  const exported = await window.crypto.subtle.exportKey('spki', publicKey);
  return bufferToHex(exported);
}

// Import public key from SPKI format
export async function importPublicKey(publicKeyHex) {
  const keyData = hexToBuffer(publicKeyHex);
  return await window.crypto.subtle.importKey(
    'spki',
    keyData,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256'
    },
    true,
    ['encrypt']
  );
}

// Export private key to PKCS8 format
export async function exportPrivateKey(privateKey) {
  const exported = await window.crypto.subtle.exportKey('pkcs8', privateKey);
  return bufferToHex(exported);
}

// Import private key from PKCS8 format
export async function importPrivateKey(privateKeyHex) {
  const keyData = hexToBuffer(privateKeyHex);
  return await window.crypto.subtle.importKey(
    'pkcs8',
    keyData,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256'
    },
    false, // not extractable
    ['decrypt']
  );
}

// Derive AES-GCM key from password using PBKDF2
export async function derivePasswordKey(password, saltHex) {
  const enc = new TextEncoder();
  const passwordBuffer = enc.encode(password);
  
  // Import password as key material
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive AES-GCM key
  return await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: hexToBuffer(saltHex),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: 256
    },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt private key with password-derived key
export async function encryptPrivateKey(privateKey, passwordKey) {
  const privateKeyHex = await exportPrivateKey(privateKey);
  const privateKeyBuffer = hexToBuffer(privateKeyHex);
  
  // Generate unique IV (12 bytes)
  const iv = new Uint8Array(12);
  window.crypto.getRandomValues(iv);
  
  // Encrypt
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    passwordKey,
    privateKeyBuffer
  );
  
  // Prepend IV to ciphertext
  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encrypted), iv.length);
  
  return bufferToHex(result.buffer);
}

// Decrypt private key with password-derived key
export async function decryptPrivateKey(encryptedPrivateKeyHex, passwordKey) {
  const encryptedBuffer = hexToBuffer(encryptedPrivateKeyHex);
  
  // Extract IV (first 12 bytes)
  const iv = encryptedBuffer.slice(0, 12);
  const ciphertext = encryptedBuffer.slice(12);
  
  // Decrypt
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    passwordKey,
    ciphertext
  );
  
  // Import as CryptoKey
  return await importPrivateKey(bufferToHex(decrypted));
}

// ============= Phase 2.2: Content Key Management =============

// Generate AES-GCM content key (256-bit)
export async function generateContentKey() {
  return await window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256
    },
    true, // extractable for encryption with RSA
    ['encrypt', 'decrypt']
  );
}

// Export content key to raw format
export async function exportContentKey(contentKey) {
  const exported = await window.crypto.subtle.exportKey('raw', contentKey);
  return bufferToHex(exported);
}

// Import content key from raw format
export async function importContentKey(contentKeyHex) {
  const keyData = hexToBuffer(contentKeyHex);
  return await window.crypto.subtle.importKey(
    'raw',
    keyData,
    {
      name: 'AES-GCM',
      length: 256
    },
    true, // extractable so it can be re-wrapped for other participants
    ['encrypt', 'decrypt']
  );
}

// Encrypt content key with RSA public key
export async function encryptContentKey(contentKey, publicKey) {
  const contentKeyRaw = await exportContentKey(contentKey);
  const contentKeyBuffer = hexToBuffer(contentKeyRaw);
  
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: 'RSA-OAEP'
    },
    publicKey,
    contentKeyBuffer
  );
  
  return bufferToHex(encrypted);
}

// Decrypt content key with RSA private key
export async function decryptContentKey(encryptedContentKeyHex, privateKey) {
  const encryptedBuffer = hexToBuffer(encryptedContentKeyHex);
  
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: 'RSA-OAEP'
    },
    privateKey,
    encryptedBuffer
  );
  
  return await importContentKey(bufferToHex(decrypted));
}

// ============= Phase 2.3: Message Encryption/Decryption =============

// Encrypt message with content key
export async function encryptMessage(messageObj, contentKey) {
  // Serialize to JSON
  const messageJson = JSON.stringify(messageObj);
  const enc = new TextEncoder();
  const messageBuffer = enc.encode(messageJson);
  
  // Generate unique IV (12 bytes)
  const iv = new Uint8Array(12);
  window.crypto.getRandomValues(iv);
  
  // Encrypt with AES-GCM
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    contentKey,
    messageBuffer
  );
  
  // Prepend IV to ciphertext
  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encrypted), iv.length);
  
  return bufferToHex(result.buffer);
}

// Decrypt message with content key
export async function decryptMessage(encryptedHex, contentKey) {
  const encryptedBuffer = hexToBuffer(encryptedHex);
  
  // Extract IV (first 12 bytes)
  const iv = encryptedBuffer.slice(0, 12);
  const ciphertext = encryptedBuffer.slice(12);
  
  // Decrypt
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    contentKey,
    ciphertext
  );
  
  // Parse JSON
  const dec = new TextDecoder();
  const messageJson = dec.decode(decrypted);
  try {
    return JSON.parse(messageJson);
  } catch (parseError) {
    console.error('Failed to parse decrypted message as JSON:', parseError);
    throw new Error(`Decrypted message is not valid JSON. This may indicate data corruption or an incorrect decryption key.`);
  }
}
