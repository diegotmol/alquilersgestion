"""
Servicio para la autenticación real con Gmail utilizando OAuth2.
"""
import os
import json
import logging
import requests
from flask import session, url_for, redirect, request
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GmailServiceReal:
    def __init__(self):
        # Ruta al archivo client_secret.json
        self.client_secrets_file = "client_secret.json"
        self.redirect_uri = "https://gestion-pagos-alquileres.onrender.com/callback"
        self.scopes = ['https://www.googleapis.com/auth/gmail.readonly']
        
        # Verificar que el archivo existe
        if not os.path.exists(self.client_secrets_file ):
            logger.error(f"El archivo {self.client_secrets_file} no existe")
    
    def get_auth_url(self):
        """
        Genera la URL de autorización para OAuth2 con Gmail.
        
        Returns:
            str: URL de autorización para OAuth2 con Gmail
            
        Raises:
            Exception: Si hay un error al generar la URL de autorización
        """
        try:
            # Verificar que el archivo existe
            if not os.path.exists(self.client_secrets_file):
                raise FileNotFoundError(f"El archivo {self.client_secrets_file} no existe")
            
            # Cambiar esto
            flow = Flow.from_client_secrets_file(
                self.client_secrets_file,
                scopes=self.scopes,
                redirect_uri=self.redirect_uri
            )
            
            auth_url, _ = flow.authorization_url(
                access_type='offline',
                include_granted_scopes='true',
                prompt='consent'
            )
            
            logger.info(f"URL de autorización generada: {auth_url[:50]}...")
            return auth_url
            
        except Exception as e:
            # Registrar el error
            logger.error(f"Error al generar URL de autorización: {str(e)}")
            # Re-lanzar la excepción para que sea manejada por el controlador
            raise
    
    def get_token(self, code):
        """
        Obtiene el token de acceso a partir del código de autorización.
        
        Args:
            code (str): Código de autorización obtenido de Google
            
        Returns:
            dict: Credenciales de acceso
            
        Raises:
            Exception: Si hay un error al obtener el token
        """
        try:
            # Verificar que el archivo existe
            if not os.path.exists(self.client_secrets_file):
                raise FileNotFoundError(f"El archivo {self.client_secrets_file} no existe")
                
            # Validar que el código no esté vacío
            if not code:
                raise ValueError("El código de autorización está vacío")
            
            # Cambiar esto también
            flow = Flow.from_client_secrets_file(
                self.client_secrets_file,
                scopes=self.scopes,
                redirect_uri=self.redirect_uri
            )
            
            # Intercambiar el código por un token
            flow.fetch_token(code=code)
            
            # Guardar las credenciales
            credentials = flow.credentials
            
            credentials_dict = {
                'token': credentials.token,
                'refresh_token': credentials.refresh_token,
                'token_uri': credentials.token_uri,
                'client_id': credentials.client_id,
                'client_secret': credentials.client_secret,
                'scopes': credentials.scopes
            }
            
            logger.info("Token obtenido correctamente")
            return credentials_dict
            
        except Exception as e:
            # Registrar el error
            logger.error(f"Error al obtener token: {str(e)}")
            # Re-lanzar la excepción para que sea manejada por el controlador
            raise
    
    def get_emails(self, credentials_dict, query="from:serviciodetransferencias@bancochile.cl", max_results=10):
        """
        Obtiene los correos electrónicos que coinciden con la consulta.
        
        Args:
            credentials_dict (dict): Credenciales de acceso
            query (str, optional): Consulta para filtrar correos. Por defecto "from:serviciodetransferencias@bancochile.cl"
            max_results (int, optional): Número máximo de resultados. Por defecto 10
            
        Returns:
            list: Lista de correos electrónicos
            
        Raises:
            Exception: Si hay un error al obtener los correos
        """
        try:
            # Validar que las credenciales no estén vacías
            if not credentials_dict:
                raise ValueError("Las credenciales están vacías")
            
            # Crear objeto Credentials
            credentials = Credentials(
                token=credentials_dict['token'],
                refresh_token=credentials_dict['refresh_token'],
                token_uri=credentials_dict['token_uri'],
                client_id=credentials_dict['client_id'],
                client_secret=credentials_dict['client_secret'],
                scopes=credentials_dict['scopes']
            )
            
            # Construir el servicio de Gmail
            service = build('gmail', 'v1', credentials=credentials)
            
            # Buscar mensajes que coincidan con la consulta
            results = service.users().messages().list(userId='me', q=query, maxResults=max_results).execute()
            messages = results.get('messages', [])
            
            logger.info(f"Se encontraron {len(messages)} mensajes que coinciden con la consulta")
            
            emails = []
            for message in messages:
                msg = service.users().messages().get(userId='me', id=message['id'], format='full').execute()
                
                # Extraer información del correo
                headers = msg['payload']['headers']
                subject = next((header['value'] for header in headers if header['name'] == 'Subject'), '')
                from_email = next((header['value'] for header in headers if header['name'] == 'From'), '')
                date = next((header['value'] for header in headers if header['name'] == 'Date'), '')
                
                # Extraer el cuerpo del mensaje
                body = ''
                if 'parts' in msg['payload']:
                    for part in msg['payload']['parts']:
                        if part['mimeType'] == 'text/html':
                            body = part['body']['data']
                            break
                        elif part['mimeType'] == 'text/plain':
                            body = part['body']['data']
                elif 'body' in msg['payload'] and 'data' in msg['payload']['body']:
                    body = msg['payload']['body']['data']
                
                emails.append({
                    'id': message['id'],
                    'subject': subject,
                    'from': from_email,
                    'date': date,
                    'body': body
                })
            
            return emails
            
        except Exception as e:
            # Registrar el error
            logger.error(f"Error al obtener correos: {str(e)}")
            # Re-lanzar la excepción para que sea manejada por el controlador
            raise
