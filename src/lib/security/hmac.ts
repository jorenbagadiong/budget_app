import crypto from 'crypto';

/**
 * Creates an HMAC-SHA256 signature for server-to-server Apps Script verification
 */
export function createSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Verifies that a received signature matches the expected signature in constant time
 */
export function verifySignature(payload: string, signature: string, secret: string): boolean {
  try {
    const expected = createSignature(payload, secret);
    const expectedBuf = Buffer.from(expected, 'hex');
    const signatureBuf = Buffer.from(signature, 'hex');

    if (expectedBuf.length !== signatureBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(expectedBuf, signatureBuf);
  } catch {
    return false;
  }
}
