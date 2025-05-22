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
        
        return {
            'total_emails': len(emails),
            'processed_emails': len(processed_emails),
            'matched_payments': matched_payments
        }
