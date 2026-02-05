/**
 * Email Templates Service
 * Sistema de Validação por CPF/CNPJ para Afiliados
 * 
 * Templates de email para notificações de regularização
 */

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface TemplateData {
  affiliateName: string;
  daysRemaining?: number;
  expiresAt?: string;
  document?: string;
  documentType?: 'CPF' | 'CNPJ';
  regularizationUrl?: string;
  supportUrl?: string;
  dashboardUrl?: string;
}

class EmailTemplatesService {
  
  /**
   * Template: Início do processo de regularização
   */
  getRegularizationStartedTemplate(data: TemplateData): EmailTemplate {
    const { affiliateName, daysRemaining = 30, regularizationUrl = '/afiliados/regularizacao' } = data;
    
    return {
      subject: 'Ação Necessária: Regularize seu documento CPF/CNPJ',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Regularização de Documento</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .alert { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔒 Regularização de Documento</h1>
            </div>
            <div class="content">
              <p>Olá, <strong>${affiliateName}</strong>!</p>
              
              <p>Para continuar como afiliado da Slim Quality, você precisa regularizar seu documento CPF ou CNPJ conforme nova exigência da Receita Federal.</p>
              
              <div class="alert">
                <strong>⏰ Prazo:</strong> ${daysRemaining} dias para regularização<br>
                <strong>📋 Ação:</strong> Cadastrar CPF (pessoa física) ou CNPJ (pessoa jurídica)
              </div>
              
              <h3>Por que é necessário?</h3>
              <ul>
                <li><strong>Conformidade Legal:</strong> Nova exigência da Receita Federal</li>
                <li><strong>Segurança:</strong> Validação de identidade contra fraudes</li>
                <li><strong>Pagamentos:</strong> Necessário para continuar recebendo comissões</li>
                <li><strong>Transparência:</strong> Cumprimento das normas fiscais</li>
              </ul>
              
              <p><strong>Não se preocupe:</strong> O processo é simples e leva apenas alguns minutos. Seus dados são protegidos conforme a LGPD.</p>
              
              <a href="${regularizationUrl}" class="button">Regularizar Agora</a>
              
              <p><small>Se você não regularizar no prazo, sua conta será temporariamente suspensa até a conclusão do processo.</small></p>
            </div>
            <div class="footer">
              <p>Slim Quality - Programa de Afiliados<br>
              Dúvidas? Entre em contato conosco.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Olá, ${affiliateName}!
        
        Para continuar como afiliado da Slim Quality, você precisa regularizar seu documento CPF ou CNPJ.
        
        Prazo: ${daysRemaining} dias
        Ação: Cadastrar CPF ou CNPJ
        
        Acesse: ${regularizationUrl}
        
        Slim Quality - Programa de Afiliados
      `
    };
  }

  /**
   * Template: Lembrete normal (>15 dias)
   */
  getRegularizationReminderNormalTemplate(data: TemplateData): EmailTemplate {
    const { affiliateName, daysRemaining = 0, regularizationUrl = '/afiliados/regularizacao' } = data;
    
    return {
      subject: 'Lembrete: Regularize seu documento CPF/CNPJ',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Lembrete de Regularização</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f0fdf4; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📋 Lembrete Amigável</h1>
            </div>
            <div class="content">
              <p>Olá, <strong>${affiliateName}</strong>!</p>
              
              <p>Este é um lembrete amigável sobre a regularização do seu documento CPF/CNPJ.</p>
              
              <p><strong>Tempo restante:</strong> ${daysRemaining} dias</p>
              
              <p>Ainda há tempo suficiente! O processo é rápido e simples:</p>
              <ol>
                <li>Acesse o link abaixo</li>
                <li>Digite seu CPF ou CNPJ</li>
                <li>Aguarde a validação automática</li>
                <li>Pronto! Sua conta estará regularizada</li>
              </ol>
              
              <a href="${regularizationUrl}" class="button">Regularizar Documento</a>
              
              <p>Obrigado por fazer parte da nossa rede de afiliados!</p>
            </div>
            <div class="footer">
              <p>Slim Quality - Programa de Afiliados</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Olá, ${affiliateName}!
        
        Lembrete: Regularize seu documento CPF/CNPJ
        Tempo restante: ${daysRemaining} dias
        
        Acesse: ${regularizationUrl}
        
        Slim Quality - Programa de Afiliados
      `
    };
  }

  /**
   * Template: Lembrete de aviso (7-15 dias)
   */
  getRegularizationReminderWarningTemplate(data: TemplateData): EmailTemplate {
    const { affiliateName, daysRemaining = 0, regularizationUrl = '/afiliados/regularizacao' } = data;
    
    return {
      subject: `Atenção: ${daysRemaining} dias para regularizar seu documento`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Aviso de Regularização</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #d97706; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #fffbeb; padding: 30px; border-radius: 0 0 8px 8px; }
            .warning { background: #fef3c7; border: 2px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .button { display: inline-block; background: #d97706; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Ação Necessária</h1>
            </div>
            <div class="content">
              <p>Olá, <strong>${affiliateName}</strong>!</p>
              
              <div class="warning">
                <strong>⏰ ATENÇÃO:</strong> Restam apenas <strong>${daysRemaining} dias</strong> para regularizar seu documento!
              </div>
              
              <p>Sua conta de afiliado será suspensa se o documento não for regularizado no prazo.</p>
              
              <p><strong>O que acontece se não regularizar:</strong></p>
              <ul>
                <li>❌ Conta temporariamente suspensa</li>
                <li>❌ Impossibilidade de receber comissões</li>
                <li>❌ Acesso limitado ao dashboard</li>
              </ul>
              
              <p><strong>Regularize agora:</strong> O processo leva menos de 5 minutos!</p>
              
              <a href="${regularizationUrl}" class="button">Regularizar Urgente</a>
              
              <p><small>Precisa de ajuda? Entre em contato conosco imediatamente.</small></p>
            </div>
            <div class="footer">
              <p>Slim Quality - Programa de Afiliados</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        ATENÇÃO: ${affiliateName}!
        
        Restam apenas ${daysRemaining} dias para regularizar seu documento!
        
        Sua conta será suspensa se não regularizar no prazo.
        
        Acesse URGENTE: ${regularizationUrl}
        
        Slim Quality - Programa de Afiliados
      `
    };
  }

  /**
   * Template: Lembrete urgente (≤7 dias)
   */
  getRegularizationReminderUrgentTemplate(data: TemplateData): EmailTemplate {
    const { affiliateName, daysRemaining = 0, regularizationUrl = '/afiliados/regularizacao' } = data;
    
    return {
      subject: `🚨 URGENTE: ${daysRemaining} dias para regularizar documento`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Urgente - Regularização</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #fef2f2; padding: 30px; border-radius: 0 0 8px 8px; }
            .urgent { background: #fee2e2; border: 3px solid #dc2626; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center; }
            .button { display: inline-block; background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-size: 18px; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚨 URGENTE</h1>
            </div>
            <div class="content">
              <p>Olá, <strong>${affiliateName}</strong>!</p>
              
              <div class="urgent">
                <h2 style="color: #dc2626; margin: 0;">⏰ ${daysRemaining} DIAS RESTANTES</h2>
                <p style="margin: 10px 0 0 0; font-size: 18px;"><strong>Sua conta será suspensa em breve!</strong></p>
              </div>
              
              <p><strong>AÇÃO IMEDIATA NECESSÁRIA:</strong></p>
              <p>Você precisa regularizar seu documento CPF/CNPJ HOJE para evitar a suspensão da sua conta.</p>
              
              <p><strong>Consequências da suspensão:</strong></p>
              <ul>
                <li>🚫 Perda de acesso ao dashboard</li>
                <li>🚫 Interrupção de comissões</li>
                <li>🚫 Bloqueio de saques pendentes</li>
              </ul>
              
              <div style="text-align: center;">
                <a href="${regularizationUrl}" class="button">REGULARIZAR AGORA</a>
              </div>
              
              <p style="color: #dc2626;"><strong>Não deixe para depois! Regularize agora mesmo.</strong></p>
            </div>
            <div class="footer">
              <p>Slim Quality - Programa de Afiliados<br>
              <strong>Suporte Urgente:</strong> Entre em contato imediatamente se precisar de ajuda</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        🚨 URGENTE: ${affiliateName}!
        
        ${daysRemaining} DIAS RESTANTES!
        
        Sua conta será suspensa se não regularizar HOJE!
        
        ACESSE AGORA: ${regularizationUrl}
        
        Não deixe para depois!
        
        Slim Quality - Programa de Afiliados
      `
    };
  }

  /**
   * Template: Regularização concluída
   */
  getRegularizationCompletedTemplate(data: TemplateData): EmailTemplate {
    const { affiliateName, document = '', documentType = 'CPF', dashboardUrl = '/afiliados/dashboard' } = data;
    
    return {
      subject: 'Parabéns! Seu documento foi regularizado com sucesso',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Regularização Concluída</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f0fdf4; padding: 30px; border-radius: 0 0 8px 8px; }
            .success { background: #dcfce7; border: 2px solid #059669; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center; }
            .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Regularização Concluída</h1>
            </div>
            <div class="content">
              <p>Parabéns, <strong>${affiliateName}</strong>!</p>
              
              <div class="success">
                <h2 style="color: #059669; margin: 0;">🎉 Documento Regularizado</h2>
                <p style="margin: 10px 0 0 0;"><strong>${documentType}:</strong> ${document}</p>
              </div>
              
              <p>Seu documento foi validado com sucesso e sua conta está totalmente regularizada!</p>
              
              <p><strong>O que isso significa:</strong></p>
              <ul>
                <li>✅ Conta ativa e em conformidade</li>
                <li>✅ Comissões liberadas normalmente</li>
                <li>✅ Acesso completo ao dashboard</li>
                <li>✅ Saques disponíveis</li>
              </ul>
              
              <p>Agora você pode continuar indicando e ganhando sem preocupações!</p>
              
              <a href="${dashboardUrl}" class="button">Acessar Dashboard</a>
              
              <p>Obrigado por manter sua conta em conformidade. Continue crescendo conosco!</p>
            </div>
            <div class="footer">
              <p>Slim Quality - Programa de Afiliados</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Parabéns, ${affiliateName}!
        
        Seu documento foi regularizado com sucesso!
        ${documentType}: ${document}
        
        Sua conta está ativa e em conformidade.
        
        Acesse: ${dashboardUrl}
        
        Slim Quality - Programa de Afiliados
      `
    };
  }

  /**
   * Template: Conta suspensa por não regularização
   */
  getRegularizationExpiredTemplate(data: TemplateData): EmailTemplate {
    const { affiliateName, regularizationUrl = '/afiliados/regularizacao', supportUrl = '/suporte' } = data;
    
    return {
      subject: 'Conta Suspensa: Prazo de regularização expirado',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Conta Suspensa</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #7c2d12; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #fef7ed; padding: 30px; border-radius: 0 0 8px 8px; }
            .suspended { background: #fed7aa; border: 2px solid #ea580c; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center; }
            .button { display: inline-block; background: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Conta Suspensa</h1>
            </div>
            <div class="content">
              <p>Olá, <strong>${affiliateName}</strong>,</p>
              
              <div class="suspended">
                <h2 style="color: #ea580c; margin: 0;">🚫 Conta Temporariamente Suspensa</h2>
                <p style="margin: 10px 0 0 0;">Prazo de regularização expirado</p>
              </div>
              
              <p>Infelizmente, o prazo para regularização do seu documento CPF/CNPJ expirou e sua conta foi temporariamente suspensa.</p>
              
              <p><strong>Status atual da conta:</strong></p>
              <ul>
                <li>🚫 Acesso ao dashboard limitado</li>
                <li>🚫 Comissões suspensas</li>
                <li>🚫 Saques bloqueados</li>
                <li>🚫 Novos indicados não computados</li>
              </ul>
              
              <p><strong>Como reativar sua conta:</strong></p>
              <ol>
                <li>Regularize seu documento CPF/CNPJ</li>
                <li>Aguarde a validação automática</li>
                <li>Sua conta será reativada imediatamente</li>
              </ol>
              
              <a href="${regularizationUrl}" class="button">Regularizar Agora</a>
              
              <p>Não se preocupe: todos os seus dados, rede e comissões pendentes estão preservados. Assim que regularizar, tudo voltará ao normal.</p>
              
              <p><a href="${supportUrl}">Precisa de ajuda? Entre em contato conosco.</a></p>
            </div>
            <div class="footer">
              <p>Slim Quality - Programa de Afiliados</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        ${affiliateName},
        
        Sua conta foi temporariamente suspensa por não regularização do documento no prazo.
        
        Para reativar:
        1. Regularize seu CPF/CNPJ
        2. Aguarde validação
        3. Conta será reativada automaticamente
        
        Acesse: ${regularizationUrl}
        
        Todos seus dados estão preservados.
        
        Slim Quality - Programa de Afiliados
      `
    };
  }

  /**
   * Obter template por tipo
   */
  getTemplate(type: string, data: TemplateData): EmailTemplate {
    switch (type) {
      case 'regularization-started':
        return this.getRegularizationStartedTemplate(data);
      case 'regularization-reminder-normal':
        return this.getRegularizationReminderNormalTemplate(data);
      case 'regularization-reminder-warning':
        return this.getRegularizationReminderWarningTemplate(data);
      case 'regularization-reminder-urgent':
        return this.getRegularizationReminderUrgentTemplate(data);
      case 'regularization-completed':
        return this.getRegularizationCompletedTemplate(data);
      case 'regularization-expired':
        return this.getRegularizationExpiredTemplate(data);
      default:
        throw new Error(`Template type '${type}' not found`);
    }
  }
}

export const emailTemplatesService = new EmailTemplatesService();
export default emailTemplatesService;