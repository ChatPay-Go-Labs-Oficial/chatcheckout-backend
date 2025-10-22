/**
 * Utilitário para validação de CNPJ com dígitos verificadores
 *
 * @description
 * Valida CNPJ brasileiro seguindo as regras oficiais da Receita Federal:
 * - CNPJ deve ter exatamente 14 dígitos
 * - Não pode ser uma sequência conhecida como inválida (00.000.000/0000-00, etc)
 * - Os dois últimos dígitos são dígitos verificadores calculados
 */
export class CnpjValidator {
  /**
   * Lista de CNPJs conhecidos como inválidos (sequências)
   */
  private static readonly KNOWN_INVALID_CNPJS = [
    '00000000000000',
    '11111111111111',
    '22222222222222',
    '33333333333333',
    '44444444444444',
    '55555555555555',
    '66666666666666',
    '77777777777777',
    '88888888888888',
    '99999999999999',
  ];

  /**
   * Valida se o CNPJ é válido
   * @param cnpj - CNPJ com ou sem formatação (apenas números serão considerados)
   * @returns true se o CNPJ é válido, false caso contrário
   */
  static validate(cnpj: string): boolean {
    if (!cnpj) {
      return false;
    }

    // Remove caracteres não numéricos
    const cleanCnpj = cnpj.replace(/\D/g, '');

    // Verifica se tem 14 dígitos
    if (cleanCnpj.length !== 14) {
      return false;
    }

    // Verifica se não é uma sequência conhecida como inválida
    if (this.KNOWN_INVALID_CNPJS.includes(cleanCnpj)) {
      return false;
    }

    // Valida primeiro dígito verificador
    let sum = 0;
    let pos = 5;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cleanCnpj.charAt(i)) * pos;
      pos = pos === 2 ? 9 : pos - 1;
    }
    let firstVerifier = sum % 11 < 2 ? 0 : 11 - (sum % 11);

    if (firstVerifier !== parseInt(cleanCnpj.charAt(12))) {
      return false;
    }

    // Valida segundo dígito verificador
    sum = 0;
    pos = 6;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cleanCnpj.charAt(i)) * pos;
      pos = pos === 2 ? 9 : pos - 1;
    }
    let secondVerifier = sum % 11 < 2 ? 0 : 11 - (sum % 11);

    if (secondVerifier !== parseInt(cleanCnpj.charAt(13))) {
      return false;
    }

    return true;
  }

  /**
   * Formata um CNPJ para o padrão brasileiro (00.000.000/0000-00)
   * @param cnpj - CNPJ sem formatação
   * @returns CNPJ formatado
   */
  static format(cnpj: string): string {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    return cleanCnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }

  /**
   * Remove formatação do CNPJ
   * @param cnpj - CNPJ com formatação
   * @returns CNPJ apenas com dígitos
   */
  static clean(cnpj: string): string {
    return cnpj.replace(/\D/g, '');
  }
}
