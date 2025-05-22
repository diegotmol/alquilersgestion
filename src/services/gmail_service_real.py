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
        try:
            # Verificar que el archivo existe
            if not os.path.exists(self.client_secrets_file):
                raise FileNotFoundError(f"El archivo {self.client_secrets_file} no existe")
            
            # Generar la URL de autorización
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
