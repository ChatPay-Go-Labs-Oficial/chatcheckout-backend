import { validate } from 'class-validator';
import { IsCpf } from '../decorators/is-cpf.decorator';
import { IsCnpj } from '../decorators/is-cnpj.decorator';

class CpfTestDto {
  @IsCpf()
  cpf: string;
}

class CnpjTestDto {
  @IsCnpj()
  cnpj: string;
}

describe('CPF Validator', () => {
  it('should accept valid CPF with formatting', async () => {
    const dto = new CpfTestDto();
    dto.cpf = '123.456.789-09';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should accept valid CPF without formatting', async () => {
    const dto = new CpfTestDto();
    dto.cpf = '12345678909';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject invalid CPF (wrong check digits)', async () => {
    const dto = new CpfTestDto();
    dto.cpf = '123.456.789-00'; // dígitos verificadores incorretos

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isCpf');
  });

  it('should reject CPF with all same digits (111.111.111-11)', async () => {
    const dto = new CpfTestDto();
    dto.cpf = '111.111.111-11';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject CPF with all zeros', async () => {
    const dto = new CpfTestDto();
    dto.cpf = '000.000.000-00';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject CPF with invalid length', async () => {
    const dto = new CpfTestDto();
    dto.cpf = '123.456.789'; // muito curto

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject empty CPF', async () => {
    const dto = new CpfTestDto();
    dto.cpf = '';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject CPF with letters', async () => {
    const dto = new CpfTestDto();
    dto.cpf = '123.456.789-AB';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should accept multiple valid CPFs', async () => {
    const validCpfs = ['111.444.777-35', '123.456.789-09', '987.654.321-00', '12345678909'];

    for (const cpf of validCpfs) {
      const dto = new CpfTestDto();
      dto.cpf = cpf;
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    }
  });
});

describe('CNPJ Validator', () => {
  it('should accept valid CNPJ with formatting', async () => {
    const dto = new CnpjTestDto();
    dto.cnpj = '11.222.333/0001-81';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should accept valid CNPJ without formatting', async () => {
    const dto = new CnpjTestDto();
    dto.cnpj = '11222333000181';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject invalid CNPJ (wrong check digits)', async () => {
    const dto = new CnpjTestDto();
    dto.cnpj = '11.222.333/0001-00'; // dígitos verificadores incorretos

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isCnpj');
  });

  it('should reject CNPJ with all same digits (11.111.111/1111-11)', async () => {
    const dto = new CnpjTestDto();
    dto.cnpj = '11.111.111/1111-11';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject CNPJ with all zeros', async () => {
    const dto = new CnpjTestDto();
    dto.cnpj = '00.000.000/0000-00';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject CNPJ with invalid length', async () => {
    const dto = new CnpjTestDto();
    dto.cnpj = '11.222.333/0001'; // muito curto

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject empty CNPJ', async () => {
    const dto = new CnpjTestDto();
    dto.cnpj = '';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject CNPJ with letters', async () => {
    const dto = new CnpjTestDto();
    dto.cnpj = '11.222.333/0001-AB';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should accept multiple valid CNPJs', async () => {
    const validCnpjs = [
      '11.222.333/0001-81',
      '11222333000181',
      '12.345.678/0001-95',
      '12345678000195',
    ];

    for (const cnpj of validCnpjs) {
      const dto = new CnpjTestDto();
      dto.cnpj = cnpj;
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    }
  });
});
