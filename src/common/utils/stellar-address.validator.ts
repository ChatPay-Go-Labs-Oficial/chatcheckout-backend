const STELLAR_ACCOUNT_VERSION_BYTE = 6 << 3;
const STELLAR_CONTRACT_VERSION_BYTE = 2 << 3;
const STELLAR_PUBLIC_KEY_LENGTH = 56;
const STELLAR_PAYLOAD_LENGTH = 32;
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export class StellarAddressValidator {
  static isValidPublicKey(address: string): boolean {
    if (!address || typeof address !== 'string') {
      return false;
    }

    const normalized = address.trim().toUpperCase();

    if (normalized.length !== STELLAR_PUBLIC_KEY_LENGTH || !/^[A-Z2-7]+$/.test(normalized)) {
      return false;
    }

    // Accept classic account IDs (G...) and smart account/contract IDs (C...)
    if (normalized[0] !== 'G' && normalized[0] !== 'C') {
      return false;
    }

    const decoded = this.decodeBase32(normalized);
    if (decoded.length !== 35) {
      return false;
    }

    const payload = decoded.slice(0, 33);
    const key = payload.slice(1);
    const checksum = decoded.slice(33);

    const validVersionByte =
      payload[0] === STELLAR_ACCOUNT_VERSION_BYTE || payload[0] === STELLAR_CONTRACT_VERSION_BYTE;
    if (!validVersionByte) {
      return false;
    }

    if (key.length !== STELLAR_PAYLOAD_LENGTH) {
      return false;
    }

    const expectedChecksum = this.crc16Xmodem(payload);
    const checksumValue = checksum[0] + (checksum[1] << 8);

    return expectedChecksum === checksumValue;
  }

  private static decodeBase32(input: string): Uint8Array {
    let bits = 0;
    let value = 0;
    const bytes: number[] = [];

    for (const char of input) {
      const idx = BASE32_ALPHABET.indexOf(char);
      if (idx === -1) {
        return new Uint8Array();
      }

      value = (value << 5) | idx;
      bits += 5;

      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }

    return Uint8Array.from(bytes);
  }

  private static crc16Xmodem(data: Uint8Array): number {
    let crc = 0x0000;

    for (const byte of data) {
      crc ^= byte << 8;

      for (let i = 0; i < 8; i += 1) {
        if ((crc & 0x8000) !== 0) {
          crc = ((crc << 1) ^ 0x1021) & 0xffff;
        } else {
          crc = (crc << 1) & 0xffff;
        }
      }
    }

    return crc;
  }
}
