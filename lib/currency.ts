/**
 * Utilitários para manipulação de valores monetários
 * Garante precisão financeira usando centavos para evitar problemas de ponto flutuante
 */

/**
 * Converte valor em reais para centavos (para armazenamento)
 * @param value Valor em reais (ex: 123.45)
 * @returns Valor em centavos (ex: 12345)
 */
export const reaisToCentavos = (value: number): number => {
  return Math.round(value * 100);
};

/**
 * Converte valor em centavos para reais (para exibição)
 * @param centavos Valor em centavos (ex: 12345)
 * @returns Valor em reais (ex: 123.45)
 */
export const centavosToReais = (centavos: number): number => {
  return centavos / 100;
};

/**
 * Formata valor monetário para exibição no padrão brasileiro
 * @param value Valor em reais ou centavos
 * @param fromCentavos Se true, converte de centavos antes de formatar
 * @returns String formatada (ex: "R$ 1.234,56")
 */
export const formatCurrency = (value: number, fromCentavos: boolean = false): string => {
  const valueInReais = fromCentavos ? centavosToReais(value) : value;
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(valueInReais);
};

/**
 * Formata valor monetário compacto (ex: R$ 1,2K, R$ 1,5M)
 * @param value Valor em reais ou centavos
 * @param fromCentavos Se true, converte de centavos antes de formatar
 * @returns String formatada compacta
 */
export const formatCurrencyCompact = (value: number, fromCentavos: boolean = false): string => {
  const valueInReais = fromCentavos ? centavosToReais(value) : value;
  
  if (valueInReais >= 1000000) {
    return `R$ ${(valueInReais / 1000000).toFixed(1)}M`;
  } else if (valueInReais >= 1000) {
    return `R$ ${(valueInReais / 1000).toFixed(1)}K`;
  }
  
  return formatCurrency(valueInReais);
};

/**
 * Valida se um valor monetário é válido
 * @param value Valor a ser validado
 * @returns true se válido, false caso contrário
 */
export const isValidCurrencyValue = (value: any): boolean => {
  if (value === null || value === undefined || value === '') return true; // Permite vazio para input
  
  // Se é uma string, verificar se contém apenas números, pontos e vírgulas
  if (typeof value === 'string') {
    // Permitir padrões como: 123, 123,45, 1.234,56, 123.456
    const pattern = /^[\d.,]+$/;
    if (!pattern.test(value)) return false;
    
    // Tentar parsear o valor
    const parsed = parseCurrencyInput(value);
    return !isNaN(parsed) && isFinite(parsed) && parsed >= 0;
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  return !isNaN(numValue) && isFinite(numValue) && numValue >= 0;
};

/**
 * Converte string de entrada do usuário para número
 * Remove formatação e converte para float
 * @param input String de entrada (ex: "R$ 1.234,56" ou "1234,56")
 * @returns Número em reais ou 0 se inválido
 */
export const parseCurrencyInput = (input: string): number => {
  if (!input || typeof input !== 'string') return 0;
  
  // Remove tudo exceto números, vírgulas e pontos
  const cleaned = input.replace(/[^\d.,]/g, '');
  
  // Se contém vírgula, assume formato brasileiro (1.234,56)
  if (cleaned.includes(',')) {
    const parts = cleaned.split(',');
    if (parts.length === 2) {
      // Remove pontos da parte inteira e junta com a parte decimal
      const integerPart = parts[0].replace(/\./g, '');
      const decimalPart = parts[1].substring(0, 2); // Máximo 2 casas decimais
      return parseFloat(`${integerPart}.${decimalPart}`) || 0;
    }
  }
  
  // Se não contém vírgula, trata como número normal
  const numValue = parseFloat(cleaned.replace(/\./g, '')) || 0;
  
  // Se valor é muito grande, pode ser que já inclua centavos
  if (numValue > 999999) {
    return numValue / 100; // Converte de centavos para reais
  }
  
  return numValue;
};

/**
 * Calcula soma de valores monetários com precisão
 * @param values Array de valores em reais
 * @returns Soma total em reais
 */
export const sumCurrencyValues = (values: number[]): number => {
  // Converte para centavos, soma, e volta para reais
  const totalCentavos = values
    .map(v => reaisToCentavos(v))
    .reduce((sum, value) => sum + value, 0);
  
  return centavosToReais(totalCentavos);
};

/**
 * Calcula percentual de um valor sobre outro
 * @param value Valor atual
 * @param total Valor total
 * @returns Percentual (0-100)
 */
export const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
};

// Constantes úteis
export const CURRENCY_LIMITS = {
  MIN_VALUE: 0,
  MAX_VALUE: 999999.99, // R$ 999.999,99
  MAX_CENTAVOS: 99999999 // 999.999,99 em centavos
} as const;

export const CURRENCY_PATTERNS = {
  // Regex para validar formato brasileiro: R$ 1.234,56
  BRAZILIAN_FORMAT: /^R\$\s?(\d{1,3}(\.\d{3})*),(\d{2})$/,
  // Regex para números com vírgula decimal
  DECIMAL_COMMA: /^\d+,\d{1,2}$/,
  // Regex para números simples
  SIMPLE_NUMBER: /^\d+(\.\d{1,2})?$/
} as const;
