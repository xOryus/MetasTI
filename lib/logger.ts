/**
 * Sistema de logging minimalista e inteligente
 * Logs bonitos com cores e emojis para desenvolvimento
 */

type LogLevel = 'info' | 'success' | 'warning' | 'error' | 'debug';

interface LogConfig {
  emoji: string;
  color: string;
  bgColor: string;
}

const logConfigs: Record<LogLevel, LogConfig> = {
  info: { emoji: '🔵', color: '#3b82f6', bgColor: '#eff6ff' },
  success: { emoji: '✅', color: '#10b981', bgColor: '#f0fdf4' },
  warning: { emoji: '⚠️', color: '#f59e0b', bgColor: '#fffbeb' },
  error: { emoji: '❌', color: '#ef4444', bgColor: '#fef2f2' },
  debug: { emoji: '🔍', color: '#8b5cf6', bgColor: '#f5f3ff' }
};

class Logger {
  private isDev = process.env.NODE_ENV === 'development';

  private formatMessage(level: LogLevel, module: string, message: string, data?: any) {
    const config = logConfigs[level];
    const timestamp = new Date().toLocaleTimeString('pt-BR', { 
      hour12: false, 
      timeStyle: 'medium' 
    });

    if (!this.isDev) return;

    // Style para o console
    const moduleStyle = `
      background: ${config.bgColor}; 
      color: ${config.color}; 
      padding: 2px 6px; 
      border-radius: 3px; 
      font-weight: bold;
      font-size: 12px;
    `;

    const timeStyle = `
      color: #6b7280; 
      font-size: 11px;
    `;

    // Log principal
    console.log(
      `%c${config.emoji} ${module}%c ${timestamp}`,
      moduleStyle,
      timeStyle
    );

    // Mensagem
    console.log(`  %c${message}`, `color: ${config.color}; font-weight: 500;`);

    // Dados adicionais (se houver)
    if (data !== undefined) {
      if (typeof data === 'object') {
        console.log('  📋 Dados:', data);
      } else {
        console.log(`  📋 ${data}`);
      }
    }

    // Separador visual
    console.log('  ' + '─'.repeat(40));
  }

  auth = {
    login: (user: string) => this.formatMessage('success', 'AUTH', `Usuário logado: ${user}`),
    logout: () => this.formatMessage('info', 'AUTH', 'Usuário deslogado'),
    profile: (sector: string, role: string) => this.formatMessage('info', 'AUTH', `Perfil carregado`, { sector, role }),
    error: (message: string) => this.formatMessage('error', 'AUTH', message)
  };

  api = {
    request: (endpoint: string) => this.formatMessage('debug', 'API', `Requisição: ${endpoint}`),
    success: (endpoint: string, count?: number) => this.formatMessage('success', 'API', `Sucesso: ${endpoint}`, count ? `${count} itens` : undefined),
    error: (endpoint: string, error: string) => this.formatMessage('error', 'API', `Erro em ${endpoint}: ${error}`)
  };

  data = {
    load: (type: string, count: number) => this.formatMessage('info', 'DATA', `${type} carregados`, `${count} itens`),
    save: (type: string) => this.formatMessage('success', 'DATA', `${type} salvo com sucesso`),
    empty: (type: string) => this.formatMessage('warning', 'DATA', `Nenhum ${type} encontrado`)
  };

  form = {
    submit: (form: string) => this.formatMessage('info', 'FORM', `Enviando ${form}...`),
    success: (form: string) => this.formatMessage('success', 'FORM', `${form} enviado com sucesso!`),
    error: (form: string, error: string) => this.formatMessage('error', 'FORM', `Erro no ${form}: ${error}`)
  };

  ui = {
    navigate: (page: string) => this.formatMessage('info', 'UI', `Navegando para ${page}`),
    render: (component: string) => this.formatMessage('debug', 'UI', `Renderizando ${component}`),
    interaction: (action: string) => this.formatMessage('debug', 'UI', `Interação: ${action}`)
  };
}

export const logger = new Logger();
