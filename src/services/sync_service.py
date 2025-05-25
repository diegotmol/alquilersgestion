""" Servicio para la sincronización de correos electrónicos. """
import logging
from datetime import datetime
import pytz  # Necesitamos importar pytz para manejar zonas horarias
from src.services.gmail_service_real import GmailServiceReal
from src.models.configuracion import Configuracion
from src.models.database import db

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SyncService:
    def __init__(self):
        self.gmail_service = GmailServiceReal()

    def sync_emails(self, credentials, mes=None):
        """
        Sincroniza los correos electrónicos con Gmail y actualiza el estado de pago.
        """
        try:
            # Mantener la consulta original rígida como lo solicitó el usuario
            query = "subject:Comprobante de pago"
            if mes:
                query += f" AND subject:{mes}"
                
            logger.info(f"Ejecutando búsqueda con query: {query}")
            
            # Obtener correos
            emails = self.gmail_service.get_emails(credentials, query=query)
            
            logger.info(f"Se encontraron {len(emails)} correos que coinciden con la búsqueda.")
            
            # Actualizar fecha de última sincronización - USAR UTC EXPLÍCITAMENTE
            # Usando pytz en lugar de datetime.timezone
            now = datetime.now(pytz.UTC)
            logger.info(f"Actualizando fecha de última sincronización a: {now}")
            
            # Buscar configuración existente o crear una nueva
            config = Configuracion.query.filter_by(clave="ultima_sincronizacion").first()
            
            if not config:
                # Crear nueva configuración
                config = Configuracion(
                    clave="ultima_sincronizacion",
                    valor=now.isoformat(),
                    descripcion="Fecha de la última sincronización de correos"
                )
                logger.info("Creando nueva configuración para última sincronización")
            else:
                # Actualizar configuración existente
                config.valor = now.isoformat()
                logger.info("Actualizando configuración existente para última sincronización")
            
            # Guardar en la base de datos
            db.session.add(config)
            db.session.commit()
            
            logger.info(f"Fecha de última sincronización guardada: {config.valor}")
            
            return {
                "success": True,
                "mensaje": f"Se encontraron {len(emails)} transferencias.",  # Mensaje modificado
                "emails": len(emails),
                "fecha_sincronizacion": now.isoformat()  # Incluir la fecha en la respuesta
            }
        except Exception as e:
            logger.error(f"Error en sincronización: {str(e)}")
            return {
                "success": False,
                "mensaje": f"Error en sincronización: {str(e)}",
                "emails": 0
            }
    
    def get_last_sync(self):
        """
        Obtiene la fecha de la última sincronización.
        
        Returns:
            dict: Información sobre la última sincronización
        """
        try:
            # Buscar la configuración por clave
            config = Configuracion.query.filter_by(clave="ultima_sincronizacion").first()
            
            if config and config.valor:
                logger.info(f"Fecha de última sincronización encontrada: {config.valor}")
                return {
                    "success": True,
                    "fecha_sincronizacion": config.valor
                }
                
            logger.info("No se encontró fecha de última sincronización")
            return {
                "success": False,
                "mensaje": "No hay registros de sincronización previa"
            }
        except Exception as e:
            logger.error(f"Error al obtener última sincronización: {str(e)}")
            raise
    
    def process_auth_callback(self, code):
        """
        Procesa el callback de autorización de OAuth2 con Gmail.
        
        Args:
            code (str): Código de autorización
            
        Returns:
            dict: Credenciales de acceso
        """
        try:
            return self.gmail_service.get_token(code)
        except Exception as e:
            logger.error(f"Error en callback de autorización: {str(e)}")
            raise
