"""
ActionExecutor - Execução de ações de automação

Responsável por executar todas as ações suportadas:
- send_email: Enviar emails usando templates
- apply_tag: Aplicar tags no CRM
- create_task: Criar tarefas no sistema
- send_notification: Enviar notificações para usuários
- send_whatsapp: Enviar mensagens WhatsApp via N8N

Implementa lógica de retry com backoff exponencial.
"""

import structlog
from typing import List, Dict, Any, Optional
from datetime import datetime
import time
import asyncio
import aiohttp
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib
import os

from .schemas import (
    RuleAction,
    ActionResult,
    ActionType,
    RetryConfig
)

logger = structlog.get_logger(__name__)


class ActionExecutorError(Exception):
    """Exceção base para erros do ActionExecutor"""
    pass


class ActionConfigError(ActionExecutorError):
    """Exceção para erros de configuração de ação"""
    pass


class ActionTimeoutError(ActionExecutorError):
    """Exceção para timeout na execução de ação"""
    pass


class ActionExecutor:
    """
    Executor de ações de automação
    
    Responsável por:
    - Executar todas as ações suportadas
    - Implementar lógica de retry com backoff exponencial
    - Isolar erros entre ações
    - Registrar logs detalhados de execução
    """
    
    def __init__(self):
        """Inicializa o executor"""
        self.retry_config = RetryConfig()
        self.session = None  # Será inicializado quando necessário
        logger.info("ActionExecutor inicializado")
    
    async def execute_actions(
        self, 
        actions: List[RuleAction], 
        context: Dict[str, Any]
    ) -> List[ActionResult]:
        """
        Executa todas as ações de uma regra
        
        Args:
            actions: Lista de ações a executar
            context: Contexto com dados para execução
            
        Returns:
            Lista de resultados das ações
        """
        logger.info(f"execute_actions: Executando {len(actions)} ações")
        
        if not actions:
            return []
        
        # Ordenar ações por ordem de execução
        sorted_actions = sorted(actions, key=lambda x: x.order)
        
        results = []
        for action in sorted_actions:
            try:
                result = await self.execute_action(action, context)
                results.append(result)
                
                # Log do resultado
                if result.status == "success":
                    logger.info(f"execute_actions: Ação {action.type} executada com sucesso")
                else:
                    logger.warning(f"execute_actions: Ação {action.type} falhou: {result.error}")
                    
            except Exception as e:
                logger.error(f"execute_actions: Erro crítico na ação {action.type}: {e}")
                
                # Criar resultado de erro
                error_result = ActionResult(
                    action_type=action.type,
                    status="failed",
                    error=f"Erro crítico: {str(e)}",
                    executed_at=datetime.now(),
                    duration_ms=0
                )
                results.append(error_result)
        
        success_count = sum(1 for r in results if r.status == "success")
        logger.info(f"execute_actions: {success_count}/{len(results)} ações executadas com sucesso")
        
        return results
    
    async def execute_action(
        self, 
        action: RuleAction, 
        context: Dict[str, Any]
    ) -> ActionResult:
        """
        Executa uma ação específica com retry
        
        Args:
            action: Ação a executar
            context: Contexto com dados
            
        Returns:
            Resultado da execução
        """
        logger.debug(f"execute_action: Executando ação {action.type}")
        start_time = time.time()
        
        # Tentar executar com retry
        for attempt in range(1, self.retry_config.max_attempts + 1):
            try:
                result = await self._execute_single_action(action, context)
                
                # Se sucesso, retornar resultado
                if result.status == "success":
                    return result
                
                # Se falha e não é última tentativa, tentar novamente
                if attempt < self.retry_config.max_attempts:
                    delay = self.retry_config.get_delay(attempt)
                    logger.warning(f"execute_action: Tentativa {attempt} falhou, tentando novamente em {delay}s")
                    await asyncio.sleep(delay)
                    continue
                
                # Última tentativa falhou
                return result
                
            except Exception as e:
                logger.error(f"execute_action: Erro na tentativa {attempt}: {e}")
                
                # Se não é última tentativa, tentar novamente
                if attempt < self.retry_config.max_attempts:
                    delay = self.retry_config.get_delay(attempt)
                    logger.warning(f"execute_action: Tentando novamente em {delay}s")
                    await asyncio.sleep(delay)
                    continue
                
                # Última tentativa - retornar erro
                duration_ms = int((time.time() - start_time) * 1000)
                return ActionResult(
                    action_type=action.type,
                    status="failed",
                    error=f"Falha após {self.retry_config.max_attempts} tentativas: {str(e)}",
                    executed_at=datetime.now(),
                    duration_ms=duration_ms
                )
    
    async def _execute_single_action(
        self, 
        action: RuleAction, 
        context: Dict[str, Any]
    ) -> ActionResult:
        """
        Executa uma única tentativa de ação
        
        Args:
            action: Ação a executar
            context: Contexto com dados
            
        Returns:
            Resultado da execução
        """
        start_time = time.time()
        
        try:
            # Resolver variáveis no config da ação
            resolved_config = self._resolve_variables(action.config, context)
            
            # Executar ação específica
            if action.type == ActionType.SEND_EMAIL:
                result_data = await self._execute_send_email(resolved_config, context)
            
            elif action.type == ActionType.APPLY_TAG:
                result_data = await self._execute_apply_tag(resolved_config, context)
            
            elif action.type == ActionType.CREATE_TASK:
                result_data = await self._execute_create_task(resolved_config, context)
            
            elif action.type == ActionType.SEND_NOTIFICATION:
                result_data = await self._execute_send_notification(resolved_config, context)
            
            elif action.type == ActionType.SEND_WHATSAPP:
                result_data = await self._execute_send_whatsapp(resolved_config, context)
            
            else:
                raise ActionConfigError(f"Tipo de ação não suportado: {action.type}")
            
            # Calcular duração
            duration_ms = int((time.time() - start_time) * 1000)
            
            return ActionResult(
                action_type=action.type,
                status="success",
                executed_at=datetime.now(),
                duration_ms=duration_ms,
                result_data=result_data
            )
            
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            logger.error(f"_execute_single_action: Erro na execução: {e}")
            
            return ActionResult(
                action_type=action.type,
                status="failed",
                error=str(e),
                executed_at=datetime.now(),
                duration_ms=duration_ms
            )
    
    async def _execute_send_email(
        self, 
        config: Dict[str, Any], 
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Executa ação de envio de email
        
        Args:
            config: Configuração da ação
            context: Contexto da execução
            
        Returns:
            Dados do resultado
        """
        logger.debug("_execute_send_email: Enviando email")
        
        # Validar configuração obrigatória
        required_fields = ["template", "recipient"]
        for field in required_fields:
            if field not in config:
                raise ActionConfigError(f"Campo obrigatório ausente: {field}")
        
        template = config["template"]
        recipient = config["recipient"]
        subject = config.get("subject", "Notificação Slim Quality")
        
        # Buscar template de email
        email_content = await self._get_email_template(template, context)
        
        # Configuração SMTP (usar variáveis de ambiente)
        smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_user = os.getenv("SMTP_USER")
        smtp_pass = os.getenv("SMTP_PASS")
        
        if not smtp_user or not smtp_pass:
            raise ActionConfigError("Configuração SMTP não encontrada (SMTP_USER, SMTP_PASS)")
        
        try:
            # Criar mensagem
            msg = MIMEMultipart()
            msg["From"] = smtp_user
            msg["To"] = recipient
            msg["Subject"] = subject
            
            # Adicionar conteúdo HTML
            msg.attach(MIMEText(email_content, "html", "utf-8"))
            
            # Enviar email
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
            
            logger.info(f"_execute_send_email: Email enviado para {recipient}")
            
            return {
                "recipient": recipient,
                "subject": subject,
                "template": template,
                "sent_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"_execute_send_email: Erro no envio: {e}")
            raise ActionExecutorError(f"Erro ao enviar email: {e}")
    
    async def _execute_apply_tag(
        self, 
        config: Dict[str, Any], 
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Executa ação de aplicar tag
        
        Args:
            config: Configuração da ação
            context: Contexto da execução
            
        Returns:
            Dados do resultado
        """
        logger.debug("_execute_apply_tag: Aplicando tag")
        
        # Validar configuração
        if "tag" not in config:
            raise ActionConfigError("Campo 'tag' é obrigatório")
        
        tag = config["tag"]
        target = config.get("target", "customer")
        
        # Obter ID do alvo (customer, lead, etc.)
        target_id = None
        if target == "customer" and "customer" in context:
            target_id = context["customer"].get("id")
        elif target == "lead" and "lead" in context:
            target_id = context["lead"].get("id")
        
        if not target_id:
            raise ActionConfigError(f"ID do alvo '{target}' não encontrado no contexto")
        
        try:
            # Aplicar tag via Supabase (assumindo tabela customer_tags)
            from ..supabase_client import get_supabase_client
            client = get_supabase_client()
            
            # Verificar se tag já existe
            existing = client.table("customer_tags").select("id").eq("customer_id", target_id).eq("tag", tag).execute()
            
            if not existing.data:
                # Inserir nova tag
                result = client.table("customer_tags").insert({
                    "customer_id": target_id,
                    "tag": tag,
                    "applied_at": datetime.now().isoformat(),
                    "applied_by": "automation"
                }).execute()
                
                logger.info(f"_execute_apply_tag: Tag '{tag}' aplicada ao {target} {target_id}")
                
                return {
                    "tag": tag,
                    "target": target,
                    "target_id": target_id,
                    "action": "applied",
                    "applied_at": datetime.now().isoformat()
                }
            else:
                logger.info(f"_execute_apply_tag: Tag '{tag}' já existe para {target} {target_id}")
                
                return {
                    "tag": tag,
                    "target": target,
                    "target_id": target_id,
                    "action": "already_exists",
                    "checked_at": datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"_execute_apply_tag: Erro ao aplicar tag: {e}")
            raise ActionExecutorError(f"Erro ao aplicar tag: {e}")
    
    async def _execute_create_task(
        self, 
        config: Dict[str, Any], 
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Executa ação de criar tarefa
        
        Args:
            config: Configuração da ação
            context: Contexto da execução
            
        Returns:
            Dados do resultado
        """
        logger.debug("_execute_create_task: Criando tarefa")
        
        # Validar configuração
        required_fields = ["title", "assignee"]
        for field in required_fields:
            if field not in config:
                raise ActionConfigError(f"Campo obrigatório ausente: {field}")
        
        title = config["title"]
        assignee = config["assignee"]
        description = config.get("description", "")
        due_date = config.get("due_date")
        priority = config.get("priority", "medium")
        
        try:
            # Criar tarefa via Supabase (assumindo tabela tasks)
            from ..supabase_client import get_supabase_client
            client = get_supabase_client()
            
            task_data = {
                "title": title,
                "description": description,
                "assignee": assignee,
                "priority": priority,
                "status": "pending",
                "created_by": "automation",
                "created_at": datetime.now().isoformat()
            }
            
            # Processar due_date se fornecido
            if due_date:
                if due_date.startswith("+"):
                    # Formato relativo: "+3 days"
                    from datetime import timedelta
                    days = int(due_date.replace("+", "").replace(" days", "").replace(" day", ""))
                    task_data["due_date"] = (datetime.now() + timedelta(days=days)).isoformat()
                else:
                    # Formato absoluto
                    task_data["due_date"] = due_date
            
            # Inserir tarefa
            result = client.table("tasks").insert(task_data).execute()
            
            if result.data:
                task_id = result.data[0]["id"]
                logger.info(f"_execute_create_task: Tarefa criada com ID {task_id}")
                
                return {
                    "task_id": task_id,
                    "title": title,
                    "assignee": assignee,
                    "priority": priority,
                    "due_date": task_data.get("due_date"),
                    "created_at": datetime.now().isoformat()
                }
            else:
                raise ActionExecutorError("Resposta vazia ao criar tarefa")
                
        except Exception as e:
            logger.error(f"_execute_create_task: Erro ao criar tarefa: {e}")
            raise ActionExecutorError(f"Erro ao criar tarefa: {e}")
    
    async def _execute_send_notification(
        self, 
        config: Dict[str, Any], 
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Executa ação de enviar notificação
        
        Args:
            config: Configuração da ação
            context: Contexto da execução
            
        Returns:
            Dados do resultado
        """
        logger.debug("_execute_send_notification: Enviando notificação")
        
        # Validar configuração
        if "message" not in config:
            raise ActionConfigError("Campo 'message' é obrigatório")
        
        message = config["message"]
        recipients = config.get("recipients", ["admin@slimquality.com"])
        notification_type = config.get("type", "info")
        
        try:
            # Enviar notificação via Supabase (assumindo tabela notifications)
            from ..supabase_client import get_supabase_client
            client = get_supabase_client()
            
            notifications_sent = []
            
            for recipient in recipients:
                notification_data = {
                    "recipient": recipient,
                    "message": message,
                    "type": notification_type,
                    "status": "sent",
                    "sent_by": "automation",
                    "sent_at": datetime.now().isoformat()
                }
                
                result = client.table("notifications").insert(notification_data).execute()
                
                if result.data:
                    notifications_sent.append({
                        "id": result.data[0]["id"],
                        "recipient": recipient
                    })
            
            logger.info(f"_execute_send_notification: {len(notifications_sent)} notificações enviadas")
            
            return {
                "message": message,
                "type": notification_type,
                "recipients_count": len(recipients),
                "notifications_sent": notifications_sent,
                "sent_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"_execute_send_notification: Erro ao enviar notificação: {e}")
            raise ActionExecutorError(f"Erro ao enviar notificação: {e}")
    
    async def _execute_send_whatsapp(
        self, 
        config: Dict[str, Any], 
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Executa ação de enviar WhatsApp via N8N
        
        Args:
            config: Configuração da ação
            context: Contexto da execução
            
        Returns:
            Dados do resultado
        """
        logger.debug("_execute_send_whatsapp: Enviando WhatsApp via N8N")
        
        # Validar configuração
        required_fields = ["template", "phone"]
        for field in required_fields:
            if field not in config:
                raise ActionConfigError(f"Campo obrigatório ausente: {field}")
        
        template = config["template"]
        phone = config["phone"]
        variables = config.get("variables", [])
        
        # URL do webhook N8N (usar variável de ambiente)
        n8n_webhook_url = os.getenv("N8N_WHATSAPP_WEBHOOK_URL")
        if not n8n_webhook_url:
            raise ActionConfigError("URL do webhook N8N não configurada (N8N_WHATSAPP_WEBHOOK_URL)")
        
        try:
            # Preparar payload para N8N
            payload = {
                "phone": phone,
                "template": template,
                "variables": variables,
                "context": context,
                "sent_by": "automation",
                "timestamp": datetime.now().isoformat()
            }
            
            # Enviar para N8N
            if not self.session:
                self.session = aiohttp.ClientSession()
            
            async with self.session.post(
                n8n_webhook_url,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                
                if response.status == 200:
                    response_data = await response.json()
                    logger.info(f"_execute_send_whatsapp: WhatsApp enviado para {phone}")
                    
                    return {
                        "phone": phone,
                        "template": template,
                        "variables": variables,
                        "n8n_response": response_data,
                        "sent_at": datetime.now().isoformat()
                    }
                else:
                    error_text = await response.text()
                    raise ActionExecutorError(f"N8N retornou status {response.status}: {error_text}")
                    
        except asyncio.TimeoutError:
            raise ActionTimeoutError("Timeout ao enviar WhatsApp via N8N")
        except Exception as e:
            logger.error(f"_execute_send_whatsapp: Erro ao enviar WhatsApp: {e}")
            raise ActionExecutorError(f"Erro ao enviar WhatsApp: {e}")
    
    def _resolve_variables(self, config: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Resolve variáveis no formato {{variable}} na configuração
        
        Args:
            config: Configuração com variáveis
            context: Contexto com dados
            
        Returns:
            Configuração com variáveis resolvidas
        """
        resolved_config = {}
        
        for key, value in config.items():
            if isinstance(value, str):
                resolved_config[key] = self._resolve_string_variables(value, context)
            elif isinstance(value, list):
                resolved_config[key] = [
                    self._resolve_string_variables(item, context) if isinstance(item, str) else item
                    for item in value
                ]
            else:
                resolved_config[key] = value
        
        return resolved_config
    
    def _resolve_string_variables(self, text: str, context: Dict[str, Any]) -> str:
        """
        Resolve variáveis em uma string
        
        Args:
            text: Texto com variáveis no formato {{variable}}
            context: Contexto com dados
            
        Returns:
            Texto com variáveis resolvidas
        """
        import re
        
        # Encontrar todas as variáveis no formato {{variable}}
        variables = re.findall(r'\{\{([^}]+)\}\}', text)
        
        resolved_text = text
        for variable in variables:
            # Extrair valor do contexto
            value = self._extract_variable_value(variable.strip(), context)
            
            # Substituir na string
            placeholder = f"{{{{{variable}}}}}"
            resolved_text = resolved_text.replace(placeholder, str(value) if value is not None else "")
        
        return resolved_text
    
    def _extract_variable_value(self, variable_path: str, context: Dict[str, Any]) -> Any:
        """
        Extrai valor de uma variável do contexto
        
        Args:
            variable_path: Caminho da variável (ex: "customer.name")
            context: Contexto com dados
            
        Returns:
            Valor da variável ou None se não encontrada
        """
        try:
            parts = variable_path.split(".")
            value = context
            
            for part in parts:
                if isinstance(value, dict) and part in value:
                    value = value[part]
                else:
                    return None
            
            return value
            
        except Exception as e:
            logger.error(f"_extract_variable_value: Erro ao extrair variável '{variable_path}': {e}")
            return None
    
    async def _get_email_template(self, template_name: str, context: Dict[str, Any]) -> str:
        """
        Busca template de email
        
        Args:
            template_name: Nome do template
            context: Contexto para personalização
            
        Returns:
            Conteúdo HTML do email
        """
        # Templates básicos (em produção, buscar do banco ou arquivos)
        templates = {
            "welcome": """
            <html>
            <body>
                <h2>Bem-vindo à Slim Quality!</h2>
                <p>Olá {{customer.name}},</p>
                <p>Obrigado por se interessar pelos nossos colchões magnéticos terapêuticos.</p>
                <p>Em breve entraremos em contato para apresentar as melhores opções para você.</p>
                <br>
                <p>Atenciosamente,<br>Equipe Slim Quality</p>
            </body>
            </html>
            """,
            "follow_up": """
            <html>
            <body>
                <h2>Não perca esta oportunidade!</h2>
                <p>Olá {{customer.name}},</p>
                <p>Notamos que você demonstrou interesse em nossos colchões magnéticos.</p>
                <p>Que tal agendar uma conversa para esclarecer suas dúvidas?</p>
                <br>
                <p>Atenciosamente,<br>Equipe Slim Quality</p>
            </body>
            </html>
            """
        }
        
        template_content = templates.get(template_name, templates["welcome"])
        
        # Resolver variáveis no template
        return self._resolve_string_variables(template_content, context)
    
    async def close(self):
        """Fecha recursos do executor"""
        if self.session:
            await self.session.close()
            self.session = None
        logger.debug("ActionExecutor recursos fechados")


# Singleton instance
_action_executor_instance: Optional[ActionExecutor] = None


def get_action_executor() -> ActionExecutor:
    """
    Obtém instância singleton do ActionExecutor
    
    Returns:
        Instância do ActionExecutor
    """
    global _action_executor_instance
    
    if _action_executor_instance is None:
        _action_executor_instance = ActionExecutor()
        logger.info("ActionExecutor singleton criado")
    
    return _action_executor_instance


# Função auxiliar para reset (útil para testes)
def reset_action_executor():
    """Reset da instância singleton (usado principalmente em testes)"""
    global _action_executor_instance
    if _action_executor_instance:
        asyncio.create_task(_action_executor_instance.close())
    _action_executor_instance = None
    logger.debug("ActionExecutor singleton resetado")