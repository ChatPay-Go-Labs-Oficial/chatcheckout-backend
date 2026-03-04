import { validate } from 'class-validator';
import { IsStellarPublicKey } from '../decorators/is-stellar-public-key.decorator';

class StellarWalletDto {
  @IsStellarPublicKey()
  walletAddress: string;
}

describe('Stellar public key validator', () => {
  it('accepts valid Stellar public key', async () => {
    const dto = new StellarWalletDto();
    dto.walletAddress = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('accepts valid Stellar smart account/contract address', async () => {
    const dto = new StellarWalletDto();
    dto.walletAddress = 'CA7KSUEHPBPOY2Z253B5IFY6E6H6JYQ5VL5GEUXLIYRDTX4PTSFMSVKV';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('rejects malformed key', async () => {
    const dto = new StellarWalletDto();
    dto.walletAddress = 'not-a-wallet';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isStellarPublicKey');
  });

  it('rejects key with invalid checksum', async () => {
    const dto = new StellarWalletDto();
    dto.walletAddress = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA6';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isStellarPublicKey');
  });

  it('rejects unsupported Stellar prefix', async () => {
    const dto = new StellarWalletDto();
    dto.walletAddress = 'MBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isStellarPublicKey');
  });
});
