"""
Servicio para sincronizar correos electrónicos con Gmail y actualizar el estado de pago.
Servicio para la sincronización de correos electrónicos.
"""
import os
import logging
from datetime import datetime
from src.services.gmail_service_real import GmailServiceReal
from src.services.email_parser import EmailParser
from src.models.inquilino import Inquilino
from src.models.configuracion import Configuracion
from src.models.database import db
from datetime import datetime

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SyncService:
def __init__(self):
self.gmail_service = GmailServiceReal()
        self.email_parser = EmailParser()

    def get_auth_url(self):
        """
        Obtiene la URL de autorización para OAuth2 con Gmail.
        """
        return self.gmail_service.get_auth_url()

    def process_auth_callback(self, code):
        """
        Procesa el callback de autorización y obtiene el token.
        """
        return self.gmail_service.get_token(code)

    
def sync_emails(self, credentials, mes=None):
"""
       Sincroniza los correos electrónicos con Gmail y actualiza el estado de pago.

        
       Args:
            credentials (dict): Credenciales de OAuth2
            mes (int, optional): Mes para filtrar los pagos. Si es None, se consideran todos los meses.

            credentials (dict): Credenciales de acceso a Gmail
            mes (str, optional): Mes para filtrar correos. Por defecto None.
            
       Returns:
           dict: Resultado de la sincronización
       """
        # Registrar la fecha y hora de sincronización actual
        fecha_sincronizacion = datetime.now()
        
        # Actualizar la configuración con la fecha de sincronización
        self._actualizar_fecha_sincronizacion(fecha_sincronizacion)
        
        # Obtener correos de Gmail
        emails = self.gmail_service.get_emails(credentials, query="from:serviciodetransferencias@bancochile.cl", max_results=20)
        
        # Procesar cada correo
        processed_emails = []
        matched_payments = []
        
        for email in emails:
            # Parsear el correo
            transfer_data = self.email_parser.parse_banco_chile_email(email)
            if not transfer_data:
                continue
                
            processed_emails.append(transfer_data)
        try:
            # Construir la consulta para filtrar correos
            query = "subject:Comprobante de pago"
            if mes:
                query += f" AND subject:{mes}"
            
            # Obtener correos
            emails = self.gmail_service.get_emails(credentials, query=query)

            # Si se especificó un mes, filtrar por ese mes
            if mes and transfer_data.get('mes') and int(transfer_data.get('mes')) != int(mes):
                continue
                
            # Realizar el matching con los inquilinos en la base de datos
            inquilinos = Inquilino.query.all()
            for inquilino in inquilinos:
                # Verificar si el nombre del propietario y el monto coinciden
                if (inquilino.propietario.lower() in transfer_data.get('destinatario', '').lower() or 
                    transfer_data.get('destinatario', '').lower() in inquilino.propietario.lower()):
                    # Verificar el monto
                    if inquilino.monto == transfer_data.get('monto'):
                        # Actualizar el estado de pago
                        inquilino.estado_pago = 'Pagado'
                        db.session.commit()
                        
                        matched_payments.append({
                            'inquilino_id': inquilino.id,
                            'inquilino_nombre': inquilino.propietario,
                            'monto': inquilino.monto,
                            'fecha_pago': transfer_data.get('fecha_texto', str(transfer_data.get('fecha')))
                        })
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
       
        # Preparar la respuesta incluyendo siempre la fecha de sincronización
        return {
            'total_emails': len(emails),
            'processed_emails': len(processed_emails),
            'matched_payments': matched_payments,
            'fecha_sincronizacion': fecha_sincronizacion.strftime('%Y-%m-%d %H:%M:%S'),
            'mensaje': f"Sincronización completada el {fecha_sincronizacion.strftime('%d/%m/%Y a las %H:%M:%S')}. " +
                      f"Se encontraron {len(emails)} correos y se procesaron {len(processed_emails)}."
        }
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

    def _actualizar_fecha_sincronizacion(self, fecha):
    def process_auth_callback(self, code):
"""
        Actualiza la fecha de última sincronización en la base de datos.
        Procesa el callback de autorización de OAuth2 con Gmail.
       
       Args:
            fecha (datetime): Fecha y hora de la sincronización
            code (str): Código de autorización
            
        Returns:
            dict: Credenciales de acceso
       """
        # Intentar obtener la configuración existente
        from src.models.configuracion import Configuracion
        
        config = Configuracion.query.filter_by(clave='ultima_sincronizacion').first()
        
        if config:
            # Actualizar la configuración existente
            config.valor = fecha.strftime('%Y-%m-%d %H:%M:%S')
        else:
            # Crear una nueva configuración
            config = Configuracion(
                clave='ultima_sincronizacion',
                valor=fecha.strftime('%Y-%m-%d %H:%M:%S'),
                descripcion='Fecha y hora de la última sincronización de correos'
            )
            db.session.add(config)
        
        # Guardar los cambios
        db.session.commit()
        try:
            return self.gmail_service.get_token(code)
        except Exception as e:
            logger.error(f"Error en callback de autorización: {str(e)}")
            raise
