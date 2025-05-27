"""
Modificación de la ruta de sincronización para soportar el parámetro de año.
"""
from flask import Blueprint, request, jsonify, session, redirect, url_for
import logging
import os
import json
from src.services.sync_service import SyncService
from src.models.configuracion import Configuracion
from src.models.database import db

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# IMPORTANTE: Definir el Blueprint ANTES de usarlo como decorador
sync_bp = Blueprint('sync', __name__)
sync_service = SyncService()

@sync_bp.route('/api/sync/emails', methods=['POST'])
def sync_emails():
    """
    Sincroniza los correos electrónicos con Gmail y actualiza el estado de pago.
    """
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No se proporcionaron datos', 'mensaje': 'Datos de solicitud vacíos'}), 400
        
        credentials = data.get('credentials')
        mes = data.get('mes')
        año = data.get('año')  # Nuevo parámetro para el año
        
        if not credentials:
            return jsonify({'error': 'No se proporcionaron credenciales', 'mensaje': 'Credenciales no encontradas en la solicitud'}), 400
        
        logger.info(f"Iniciando sincronización de correos para el mes: {mes}, año: {año}")
        result = sync_service.sync_emails(credentials, mes, año)
        return jsonify(result)
    except Exception as e:
        # Asegurar que siempre devolvemos JSON, incluso en caso de error
        logger.error(f"Error en sincronización de correos: {str(e)}")
        return jsonify({'error': str(e), 'mensaje': 'Error en sincronización de correos'}), 500

@sync_bp.route('/api/sync/last', methods=['GET'])
def get_last_sync():
    """
    Obtiene la fecha de la última sincronización.
    """
    try:
        last_sync = sync_service.get_last_sync()
        return jsonify({'last_sync': last_sync})
    except Exception as e:
        # Asegurar que siempre devolvemos JSON, incluso en caso de error
        logger.error(f"Error al obtener última sincronización: {str(e)}")
        return jsonify({'error': str(e), 'mensaje': 'Error al obtener última sincronización'}), 500

@sync_bp.route('/api/auth/url', methods=['GET'])
def get_auth_url():
    """
    Obtiene la URL de autorización para OAuth2 con Gmail.
    """
    logger.info("Endpoint /api/auth/url llamado")
    try:
        # Verificar que el archivo client_secret.json existe
        client_secrets_file = os.path.join(os.getcwd(), "client_secret.json")
        logger.info(f"Verificando existencia de client_secret.json en: {client_secrets_file}")
        
        if not os.path.exists(client_secrets_file):
            error_msg = f"El archivo client_secret.json no existe en: {client_secrets_file}"
            logger.error(error_msg)
            return jsonify({
                'error': 'El archivo client_secret.json no existe',
                'mensaje': 'Archivo de credenciales no encontrado'
            }), 500
        
        # Cargar client_id directamente desde el archivo para asegurar consistencia
        try:
            with open(client_secrets_file, 'r') as f:
                json_content = json.load(f)
                
            if 'web' in json_content and 'client_id' in json_content['web']:
                client_id = json_content['web']['client_id']
                redirect_uri = "https://gestion-pagos-alquileres.onrender.com/callback"
                scope = "https://www.googleapis.com/auth/gmail.readonly"
                
                # Generar URL usando el client_id cargado del archivo
                auth_url = f"https://accounts.google.com/o/oauth2/auth?client_id={client_id}&redirect_uri={redirect_uri}&scope={scope}&response_type=code&access_type=offline&prompt=consent"
                
                logger.info(f"URL de autorización generada con client_id desde archivo: {auth_url[:50]}...")
                return jsonify({'auth_url': auth_url})
            else:
                error_msg = "Formato incorrecto en client_secret.json"
                logger.error(error_msg)
                return jsonify({
                    'error': error_msg,
                    'mensaje': 'El archivo de credenciales no tiene el formato esperado'
                }), 500
                
        except json.JSONDecodeError as e:
            error_msg = f"Error al parsear client_secret.json: {str(e)}"
            logger.error(error_msg)
            return jsonify({
                'error': str(e),
                'mensaje': 'Error al leer el archivo de credenciales'
            }), 500
            
    except Exception as e:
        # Asegurar que siempre devolvemos JSON, incluso en caso de error
        error_msg = f"Error no manejado en get_auth_url: {str(e)}"
        logger.error(error_msg)
        return jsonify({
            'error': str(e),
            'mensaje': 'Error al obtener URL de autorización'
        }), 500

@sync_bp.route('/callback')
def auth_callback():
    """
    Callback para la autorización de OAuth2 con Gmail.
    """
    try:
        code = request.args.get('code')
        if not code:
            logger.error("No se proporcionó código de autorización")
            # Redirigir a la página principal con un mensaje de error
            return redirect('/?error=No se proporcionó código de autorización')
        
        logger.info("Procesando callback de autorización")
        credentials = sync_service.process_auth_callback(code)
        
        # Redirigir a la página principal con las credenciales como parámetro
        credentials_str = str(credentials).replace("'", '"')
        logger.info("Callback procesado correctamente, redirigiendo a la página principal")
        return redirect(f'/?credentials={credentials_str}')
    except Exception as e:
        # Registrar el error
        logger.error(f"Error en el callback de autenticación: {str(e)}")
        # Redirigir a la página principal con un mensaje de error
        return redirect(f'/?error={str(e)}')
