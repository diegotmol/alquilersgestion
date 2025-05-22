"""
Rutas para la sincronización de correos electrónicos.
"""
from flask import Blueprint, request, jsonify, session, redirect, url_for
import logging
import os
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
        
        if not credentials:
            return jsonify({'error': 'No se proporcionaron credenciales', 'mensaje': 'Credenciales no encontradas en la solicitud'}), 400
            
        logger.info(f"Iniciando sincronización de correos para el mes: {mes}")
        result = sync_service.sync_emails(credentials, mes)
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
        
        # Generar URL fija para pruebas (esto funcionó en la solución 1)
        auth_url = "https://accounts.google.com/o/oauth2/auth?client_id=969401828234-ijgdtjlo8kedp831a8jvndv5aejek18.apps.googleusercontent.com&redirect_uri=https://gestion-pagos-alquileres.onrender.com/callback&scope=https://www.googleapis.com/auth/gmail.readonly&response_type=code&access_type=offline&prompt=consent"
        
        logger.info(f"URL de autorización generada: {auth_url[:50]}..." )
        return jsonify({'auth_url': auth_url})
        
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
