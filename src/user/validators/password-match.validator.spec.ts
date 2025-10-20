import { PasswordMatchConstraint } from './password-match.validator';
import { ValidationArguments } from 'class-validator';

describe('PasswordMatchConstraint', () => {
  let constraint: PasswordMatchConstraint;

  beforeEach(() => {
    constraint = new PasswordMatchConstraint();
  });

  it('deve ser definido', () => {
    expect(constraint).toBeDefined();
  });

  it('deve retornar true quando senhas coincidem', () => {
    const args: ValidationArguments = {
      object: { password: 'MinhaSenh@123', confirmPassword: 'MinhaSenh@123' },
      property: 'confirmPassword',
      value: 'MinhaSenh@123',
      constraints: ['password'],
      targetName: 'CreateUserDto',
    };

    const result = constraint.validate('MinhaSenh@123', args);
    expect(result).toBe(true);
  });

  it('deve retornar false quando senhas não coincidem', () => {
    const args: ValidationArguments = {
      object: { password: 'MinhaSenh@123', confirmPassword: 'SenhasDiferentes@456' },
      property: 'confirmPassword',
      value: 'SenhasDiferentes@456',
      constraints: ['password'],
      targetName: 'CreateUserDto',
    };

    const result = constraint.validate('SenhasDiferentes@456', args);
    expect(result).toBe(false);
  });

  it('deve retornar false quando password é undefined', () => {
    const args: ValidationArguments = {
      object: { password: undefined, confirmPassword: 'MinhaSenh@123' },
      property: 'confirmPassword',
      value: 'MinhaSenh@123',
      constraints: ['password'],
      targetName: 'CreateUserDto',
    };

    const result = constraint.validate('MinhaSenh@123', args);
    expect(result).toBe(false);
  });

  it('deve retornar true quando ambos são undefined', () => {
    const args: ValidationArguments = {
      object: { password: undefined, confirmPassword: undefined },
      property: 'confirmPassword',
      value: undefined,
      constraints: ['password'],
      targetName: 'CreateUserDto',
    };

    const result = constraint.validate(undefined as any, args);
    expect(result).toBe(true);
  });

  it('deve retornar a mensagem padrão', () => {
    const message = constraint.defaultMessage();
    expect(message).toBe('As senhas não coincidem');
  });
});
