"""
Servicio para la autenticación real con Gmail utilizando OAuth2.
"""
import os
import json
import logging
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
        
        # Verificar si tenemos el archivo
        if os.path.exists(self.client_secrets_file):
            logger.info(f"Archivo {self.client_secrets_file} encontrado")
        else:
            logger.warning(f"No se encontró el archivo {self.client_secrets_file}. Asegúrate de que esté en la raíz del proyecto.")
    
    def get_auth_url(self):
        """
        Genera la URL de autorización para OAuth2 con Gmail.
        """
        logger.info("Iniciando get_auth_url()")
        try:
            # Usar el enfoque que funcionaba antes con Flow
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
            logger.error(f"Error al generar URL de autorización: {str(e)}")
            # Si hay un error, intentar con la URL fija como respaldo
            client_id = "969401828234-ijgdtjlo8kedp031a8jvndv5aejek18.apps.googleusercontent.com"
            auth_url = f"https://accounts.google.com/o/oauth2/auth?client_id={client_id}&redirect_uri={self.redirect_uri}&scope=https://www.googleapis.com/auth/gmail.readonly&response_type=code&access_type=offline&prompt=consent"
            logger.info(f"URL de autorización fija generada como respaldo: {auth_url[:50]}...")
            return auth_url
    
    def get_token(self, code):
        """
        Obtiene el token de acceso a partir del código de autorización.
        """
        logger.info(f"Iniciando get_token con código: {code[:10]}...")
        try:
            # Usar el enfoque que funcionaba antes
            flow = Flow.from_client_secrets_file(
                self.client_secrets_file,
                scopes=self.scopes,
                redirect_uri=self.redirect_uri
            )
            
            # Intercambiar el código por un token
            flow.fetch_token(code=code)
            
            # Guardar las credenciales
            credentials = flow.credentials
            logger.info("Token obtenido correctamente")
            return {
                'token': credentials.token,
                'refresh_token': credentials.refresh_token,
                'token_uri': credentials.token_uri,
                'client_id': credentials.client_id,
                'client_secret': credentials.client_secret,
                'scopes': credentials.scopes
            }
        except Exception as e:
            logger.error(f"Error al obtener token: {str(e)}")
            raise
    
    def get_emails(self, credentials_dict, query="from:serviciodetransferencias@bancochile.cl", max_results=10):
        """
        Obtiene los correos electrónicos que coinciden con la consulta.
        """
        logger.info(f"Iniciando get_emails con query: {query}")
        try:
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
            
            if not messages:
                logger.info("No se encontraron mensajes")
                return []
            
            logger.info(f"Se encontraron {len(messages)} mensajes")
            
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
            
            logger.info(f"Procesados {len(emails)} correos electrónicos")
            return emails
            
        except Exception as e:
            logger.error(f"Error al obtener correos: {str(e)}")
            raise
