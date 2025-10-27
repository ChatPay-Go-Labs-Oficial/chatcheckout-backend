/**
 * Utilitário para validação de CPF com dígitos verificadores
 *
 * @description
 * Valida CPF brasileiro seguindo as regras oficiais da Receita Federal:
 * - CPF deve ter exatamente 11 dígitos
 * - Não pode ser uma sequência conhecida como inválida (111.111.111-11, etc)
 * - Os dois últimos dígitos são dígitos verificadores calculados
 */
export class CpfValidator {
  /**
   * Lista de CPFs conhecidos como inválidos (sequências)
   */
  private static readonly KNOWN_INVALID_CPFS = [
    '00000000000',
    '11111111111',
    '22222222222',
    '33333333333',
    '44444444444',
    '55555555555',
    '66666666666',
    '77777777777',
    '88888888888',
    '99999999999',
  ];

  /**
   * Valida se o CPF é válido
   * @param cpf - CPF com ou sem formatação (apenas números serão considerados)
   * @returns true se o CPF é válido, false caso contrário
   */
  static validate(cpf: string): boolean {
    if (!cpf) {
      return false;
    }

    // Remove caracteres não numéricos
    const cleanCpf = cpf.replace(/\D/g, '');

    // Verifica se tem 11 dígitos
    if (cleanCpf.length !== 11) {
      return false;
    }

    // Verifica se não é uma sequência conhecida como inválida
    if (this.KNOWN_INVALID_CPFS.includes(cleanCpf)) {
      return false;
    }

    // Valida primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCpf.charAt(i)) * (10 - i);
    }
    let firstVerifier = 11 - (sum % 11);
    if (firstVerifier >= 10) {
      firstVerifier = 0;
    }

    if (firstVerifier !== parseInt(cleanCpf.charAt(9))) {
      return false;
    }

    // Valida segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCpf.charAt(i)) * (11 - i);
    }
    let secondVerifier = 11 - (sum % 11);
    if (secondVerifier >= 10) {
      secondVerifier = 0;
    }

    if (secondVerifier !== parseInt(cleanCpf.charAt(10))) {
      return false;
    }

    return true;
  }

  /**
   * Formata um CPF para o padrão brasileiro (000.000.000-00)
   * @param cpf - CPF sem formatação
   * @returns CPF formatado
   */
  static format(cpf: string): string {
    const cleanCpf = cpf.replace(/\D/g, '');
    return cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  /**
   * Remove formatação do CPF
   * @param cpf - CPF com formatação
   * @returns CPF apenas com dígitos
   */
  static clean(cpf: string): string {
    return cpf.replace(/\D/g, '');
  }
}
