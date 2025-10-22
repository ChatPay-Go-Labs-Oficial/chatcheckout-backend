import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { CnpjValidator } from '../utils/cnpj.validator';

/**
 * Constraint para validação de CNPJ
 */
@ValidatorConstraint({ name: 'isCnpj', async: false })
export class IsCnpjConstraint implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    if (!value) {
      return false;
    }
    return CnpjValidator.validate(value);
  }

  defaultMessage(): string {
    return 'CNPJ inválido';
  }
}

/**
 * Decorator para validar CNPJ usando class-validator
 *
 * @example
 * ```typescript
 * class CreateUserDto {
 *   @IsCnpj({ message: 'CNPJ deve ser válido' })
 *   cnpj?: string;
 * }
 * ```
 */
export function IsCnpj(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsCnpjConstraint,
    });
  };
}
