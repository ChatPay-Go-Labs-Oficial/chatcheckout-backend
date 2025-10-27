import { CpfValidator } from './cpf.validator';
import { CnpjValidator } from './cnpj.validator';

/**
 * Tipos de identificadores suportados
 */
export enum IdentifierType {
  EMAIL = 'email',
  CPF = 'cpf',
  CNPJ = 'cnpj',
  UNKNOWN = 'unknown',
}

/**
 * Resultado da detecção de identificador
 */
export interface IdentifierDetectionResult {
  type: IdentifierType;
  cleanValue: string;
  isValid: boolean;
}

/**
 * Utilitário para detectar e validar o tipo de identificador (email, CPF ou CNPJ)
 */
export class IdentifierDetector {
  /**
   * Regex simplificado para validação de email
   */
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /**
   * Detecta o tipo de identificador fornecido
   * @param identifier - Identificador a ser detectado
   * @returns Resultado com tipo, valor limpo e validade
   */
  static detect(identifier: string): IdentifierDetectionResult {
    if (!identifier || typeof identifier !== 'string') {
      return {
        type: IdentifierType.UNKNOWN,
        cleanValue: '',
        isValid: false,
      };
    }

    const trimmed = identifier.trim();

    // Verificar se é email
    if (this.EMAIL_REGEX.test(trimmed)) {
      return {
        type: IdentifierType.EMAIL,
        cleanValue: trimmed.toLowerCase(),
        isValid: true,
      };
    }

    // Remove caracteres não numéricos para verificar CPF/CNPJ
    const onlyNumbers = trimmed.replace(/\D/g, '');

    // Verificar se é CPF (11 dígitos)
    if (onlyNumbers.length === 11) {
      return {
        type: IdentifierType.CPF,
        cleanValue: onlyNumbers,
        isValid: CpfValidator.validate(onlyNumbers),
      };
    }

    // Verificar se é CNPJ (14 dígitos)
    if (onlyNumbers.length === 14) {
      return {
        type: IdentifierType.CNPJ,
        cleanValue: onlyNumbers,
        isValid: CnpjValidator.validate(onlyNumbers),
      };
    }

    // Não foi possível identificar
    return {
      type: IdentifierType.UNKNOWN,
      cleanValue: trimmed,
      isValid: false,
    };
  }

  /**
   * Verifica se o identificador é válido
   * @param identifier - Identificador a ser validado
   * @returns true se válido, false caso contrário
   */
  static isValid(identifier: string): boolean {
    return this.detect(identifier).isValid;
  }

  /**
   * Retorna o tipo do identificador
   * @param identifier - Identificador
   * @returns Tipo do identificador
   */
  static getType(identifier: string): IdentifierType {
    return this.detect(identifier).type;
  }

  /**
   * Limpa e normaliza o identificador
   * @param identifier - Identificador
   * @returns Valor limpo e normalizado
   */
  static clean(identifier: string): string {
    return this.detect(identifier).cleanValue;
  }
}
