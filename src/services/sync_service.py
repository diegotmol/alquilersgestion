"""
Servicio para sincronizar correos electrónicos con Gmail y actualizar el estado de pago.
"""
import os
from src.services.gmail_service_real import GmailServiceReal
from src.services.email_parser import EmailParser
from src.models.inquilino import Inquilino
from src.models.database import db
from datetime import datetime

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
            
            # Si se especificó un mes, filtrar por ese mes
            if mes and transfer_data.get('mes') and int(transfer_data.get('mes')) != int(mes):
                continue
                
            # Realizar el matching con los inquilinos en la base de datos
            inquilinos = Inquilino.query.all()
            for inquilino in inquilinos:
                # Verificar si el nombre del propietario y el monto coinciden
                if (inquilino.nombre.lower() in transfer_data.get('destinatario', '').lower() or 
                    transfer_data.get('destinatario', '').lower() in inquilino.nombre.lower()):
                    # Verificar el monto
                    if inquilino.monto == transfer_data.get('monto'):
                        # Actualizar el estado de pago
                        inquilino.pagado = True
                        db.session.commit()
                        
                        matched_payments.append({
                            'inquilino_id': inquilino.id,
                            'inquilino_nombre': inquilino.nombre,
                            'monto': inquilino.monto,
                            'fecha_pago': transfer_data.get('fecha_texto', str(transfer_data.get('fecha')))
                        })
        
        # Preparar la respuesta incluyendo siempre la fecha de sincronización
        return {
            'total_emails': len(emails),
            'processed_emails': len(processed_emails),
            'matched_payments': matched_payments,
            'fecha_sincronizacion': fecha_sincronizacion.strftime('%Y-%m-%d %H:%M:%S'),
            'mensaje': f"Sincronización completada el {fecha_sincronizacion.strftime('%d/%m/%Y a las %H:%M:%S')}. " +
                      f"Se encontraron {len(emails)} correos y se procesaron {len(processed_emails)}."
        }
    
    def _actualizar_fecha_sincronizacion(self, fecha):
        """
        Actualiza la fecha de última sincronización en la base de datos.
        
        Args:
            fecha (datetime): Fecha y hora de la sincronización
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
