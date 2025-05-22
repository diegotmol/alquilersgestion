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
        # Ruta al archivo client_secret.json - usar ruta absoluta
        self.client_secrets_file = os.path.join(os.getcwd(), "client_secret.json")
        self.redirect_uri = "https://gestion-pagos-alquileres.onrender.com/callback"
        self.scopes = ['https://www.googleapis.com/auth/gmail.readonly']
        
        # Verificar que el archivo existe
        if os.path.exists(self.client_secrets_file ):
            logger.info(f"Archivo {self.client_secrets_file} encontrado")
            # Verificar que es un JSON válido
            try:
                with open(self.client_secrets_file, 'r') as f:
                    json_content = json.load(f)
                    logger.info("Archivo client_secret.json es un JSON válido")
                    # Verificar estructura básica
                    if 'web' in json_content or 'installed' in json_content:
                        logger.info("Estructura de client_secret.json parece correcta")
                    else:
                        logger.warning("Estructura de client_secret.json no tiene formato esperado de OAuth2")
            except json.JSONDecodeError as e:
                logger.error(f"Archivo client_secret.json no es un JSON válido: {str(e)}")
        else:
            logger.error(f"Archivo {self.client_secrets_file} no existe")
    
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
            # Verificar que el archivo existe
            if not os.path.exists(self.client_secrets_file):
                error_msg = f"El archivo {self.client_secrets_file} no existe"
                logger.error(error_msg)
                raise FileNotFoundError(error_msg)
            
            logger.info(f"Archivo {self.client_secrets_file} encontrado, verificando contenido...")
            
            # Leer el archivo para verificar que es un JSON válido
            try:
                with open(self.client_secrets_file, 'r') as f:
                    json_content = json.load(f)
                    # Verificar que tiene la estructura esperada
                    if 'web' not in json_content and 'installed' not in json_content:
                        error_msg = f"El archivo {self.client_secrets_file} no tiene la estructura esperada de credenciales OAuth2"
                        logger.error(error_msg)
                        raise ValueError(error_msg)
                    logger.info("Contenido de client_secret.json validado correctamente")
            except json.JSONDecodeError as e:
                error_msg = f"El archivo {self.client_secrets_file} no es un JSON válido: {str(e)}"
                logger.error(error_msg)
                raise ValueError(error_msg)
            
            # Generar la URL de autorización
            logger.info("Creando flujo OAuth2...")
            flow = Flow.from_client_secrets_file(
                self.client_secrets_file,
                scopes=self.scopes,
                redirect_uri=self.redirect_uri
            )
            
            logger.info("Generando URL de autorización...")
            auth_url, _ = flow.authorization_url(
                access_type='offline',
                include_granted_scopes='true',
                prompt='consent'
            )
            
            # Verificar explícitamente que la URL no sea None o vacía
            if not auth_url:
                error_msg = "URL de autorización generada es None o vacía"
                logger.error(error_msg)
                raise ValueError(error_msg)
                
            logger.info(f"URL de autorización generada exitosamente: {auth_url[:50]}...")
            return auth_url
            
        except Exception as e:
            # Registrar el error con detalles
            error_msg = f"Error al generar URL de autorización: {str(e)}"
            logger.error(error_msg)
            # Re-lanzar la excepción para que sea manejada por el controlador
            raise Exception(error_msg)
    
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
                msg = service.users().messages().get(userId='me', id=message['id']).execute()
                emails.append(msg)
            
            return emails
        except Exception as e:
            logger.error(f"Error al obtener correos: {str(e)}")
            raise
