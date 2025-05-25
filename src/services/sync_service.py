""" Servicio para la sincronización de correos electrónicos. """
import logging
from datetime import datetime
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

        Args:
            credentials (dict): Credenciales de acceso a Gmail
            mes (str, optional): Mes para filtrar correos. Por defecto None.

        Returns:
            dict: Resultado de la sincronización
        """
        try:
            # Construir la consulta para filtrar correos
            query = "subject:Comprobante de pago"
            if mes:
                query += f" AND subject:{mes}"

            # Obtener correos
            emails = self.gmail_service.get_emails(credentials, query=query)

            # Actualizar fecha de última sincronización
            config = Configuracion.query.first()
            if not config:
                config = Configuracion(ultima_sincronizacion=datetime.now())
            else:
                config.ultima_sincronizacion = datetime.now()
            db.session.add(config)
            db.session.commit()

            return {
                "success": True,
                "mensaje": f"Se sincronizaron {len(emails)} correos",
                "emails": len(emails)
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
            str: Fecha de la última sincronización en formato ISO
        """
        try:
            config = Configuracion.query.first()
            if config and config.ultima_sincronizacion:
                return config.ultima_sincronizacion.isoformat()
            return None
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
