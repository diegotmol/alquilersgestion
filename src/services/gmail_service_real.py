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
from urllib.parse import urlencode

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GmailServiceReal:
    def __init__(self):
        # Intentar usar variables de entorno primero
        self.client_id = os.getenv('GOOGLE_CLIENT_ID')
        self.client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
        self.redirect_uri = os.getenv('GOOGLE_REDIRECT_URI', "https://gestion-pagos-alquileres.onrender.com/callback")
        
        # Usar el scope de Gmail para lectura
        self.scopes = ['https://www.googleapis.com/auth/gmail.readonly']
        
        # Ruta al archivo client_secret.json como respaldo
        self.client_secrets_file = "client_secret.json"
        
        # Verificar si tenemos credenciales de entorno o archivo
        if self.client_id and self.client_secret:
            logger.info("Usando credenciales OAuth desde variables de entorno")
        elif os.path.exists(self.client_secrets_file):
            logger.info(f"Archivo {self.client_secrets_file} encontrado")
            # Cargar client_id desde el archivo para asegurar consistencia
            try:
                with open(self.client_secrets_file, 'r') as f:
                    json_content = json.load(f)
                    if 'web' in json_content:
                        self.client_id = json_content['web']['client_id']
                        self.client_secret = json_content['web']['client_secret']
                        logger.info(f"Client ID cargado desde client_secret.json: {self.client_id[:20]}...")
                    else:
                        logger.warning("Estructura de client_secret.json no tiene formato esperado de OAuth2")
            except json.JSONDecodeError as e:
                logger.error(f"Archivo client_secret.json no es un JSON válido: {str(e)}")
        else:
            logger.error(f"No se encontraron credenciales OAuth (ni variables de entorno ni archivo {self.client_secrets_file})")
    
    def get_auth_url(self):
        """
        Genera la URL de autorización para OAuth2 con Gmail.
        
        Returns:
            str: URL de autorización para OAuth2 con Gmail
            
        Raises:
            Exception: Si hay un error al generar la URL de autorización
        """
        logger.info("Iniciando get_auth_url()")
        try:
            # Verificar que tenemos un client_id
            if not self.client_id:
                raise ValueError("No se encontró client_id válido para generar URL de autorización")
                
            # Generar URL usando el client_id cargado del archivo client_secret.json
            # para asegurar consistencia
            auth_url = f"https://accounts.google.com/o/oauth2/auth?client_id={self.client_id}&redirect_uri={self.redirect_uri}&scope=https://www.googleapis.com/auth/gmail.readonly&response_type=code&access_type=offline&prompt=consent"
            
            logger.info(f"URL de autorización generada con client_id consistente: {auth_url[:50]}...")
            return auth_url
        except Exception as e:
            logger.error(f"Error al generar URL de autorización: {str(e)}")
            raise
    
    def get_token(self, code):
        """
        Obtiene el token de acceso a partir del código de autorización.
        
        Args:
            code (str): Código de autorización obtenido del callback
            
        Returns:
            dict: Credenciales de acceso
            
        Raises:
            Exception: Si hay un error al obtener el token
        """
        try:
            # Si tenemos credenciales en variables de entorno, usarlas directamente
            if self.client_id and self.client_secret:
                # Construir el flujo manualmente
                flow = Flow.from_client_config(
                    {
                        "web": {
                            "client_id": self.client_id,
                            "client_secret": self.client_secret,
                            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                            "token_uri": "https://oauth2.googleapis.com/token",
                            "redirect_uris": [self.redirect_uri]
                        }
                    },
                    scopes=self.scopes,
                    redirect_uri=self.redirect_uri
                )
            else:
                # Usar el archivo client_secret.json
                flow = Flow.from_client_secrets_file(
                    self.client_secrets_file,
                    scopes=self.scopes,
                    redirect_uri=self.redirect_uri
                )
            
            flow.fetch_token(code=code)
            credentials = flow.credentials
            
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
    
    def get_emails(self, credentials, query='', max_results=10):
        """
        Obtiene los correos electrónicos de Gmail.
        
        Args:
            credentials (dict): Credenciales de acceso
            query (str, optional): Consulta para filtrar correos. Por defecto ''.
            max_results (int, optional): Número máximo de resultados. Por defecto 10.
            
        Returns:
            list: Lista de correos electrónicos
            
        Raises:
            Exception: Si hay un error al obtener los correos
        """
        try:
            creds = Credentials(
                token=credentials.get('token'),
                refresh_token=credentials.get('refresh_token'),
                token_uri=credentials.get('token_uri'),
                client_id=credentials.get('client_id'),
                client_secret=credentials.get('client_secret'),
                scopes=credentials.get('scopes')
            )
            
            service = build('gmail', 'v1', credentials=creds)
            
            # Obtener lista de mensajes
            results = service.users().messages().list(userId='me', q=query, maxResults=max_results).execute()
            messages = results.get('messages', [])
            
            if not messages:
                logger.info("No se encontraron mensajes")
                return []
            
            # Obtener detalles de cada mensaje
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
