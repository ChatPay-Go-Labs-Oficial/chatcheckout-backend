import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { CpfValidator } from '../utils/cpf.validator';

/**
 * Constraint para validação de CPF
 */
@ValidatorConstraint({ name: 'isCpf', async: false })
export class IsCpfConstraint implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    if (!value) {
      return false;
    }
    return CpfValidator.validate(value);
  }

  defaultMessage(): string {
    return 'CPF inválido';
  }
}

/**
 * Decorator para validar CPF usando class-validator
 *
 * @example
 * ```typescript
 * class CreateUserDto {
 *   @IsCpf({ message: 'CPF deve ser válido' })
 *   cpf: string;
 * }
 * ```
 */
export function IsCpf(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsCpfConstraint,
    });
  };
}
