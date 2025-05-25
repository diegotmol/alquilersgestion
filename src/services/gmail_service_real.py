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
        # Ruta al archivo client_secret.json
        self.client_secrets_file = "client_secret.json"
        self.redirect_uri = "https://gestion-pagos-alquileres.onrender.com/callback"
        self.scopes = ['https://www.googleapis.com/auth/gmail.readonly']
        
        # Variables de entorno como respaldo
        self.client_id = os.getenv('GOOGLE_CLIENT_ID' )
        self.client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
        
        # Verificar si tenemos el archivo
        if os.path.exists(self.client_secrets_file):
            logger.info(f"Archivo {self.client_secrets_file} encontrado")
        else:
            logger.warning(f"No se encontró el archivo {self.client_secrets_file}")

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
            raise

    def get_token(self, code):
        """
        Obtiene el token de acceso a partir del código de autorización.
        """
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
                msg = service.users().messages().get(userId='me', id=message['id']).execute()
                emails.append(msg)
            
            return emails
            
        except Exception as e:
            logger.error(f"Error al obtener correos: {str(e)}")
            raise
