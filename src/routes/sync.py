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
        return jsonify({'error': str(e), 'mensaje': 'Error al sincronizar correos'}), 500

@sync_bp.route('/api/sync/last', methods=['GET'])
def get_last_sync():
    """
    Obtiene la fecha de la última sincronización.
    """
    try:
        # Buscar la configuración de última sincronización
        config = Configuracion.query.filter_by(clave='ultima_sincronizacion').first()
        
        if config:
            logger.info(f"Última sincronización encontrada: {config.valor}")
            return jsonify({
                'fecha_sincronizacion': config.valor,
                'mensaje': f'Última sincronización: {config.valor}'
            })
        else:
            logger.info("No hay registros de sincronización")
            return jsonify({
                'fecha_sincronizacion': None,
                'mensaje': 'No hay registros de sincronización'
            })
    except Exception as e:
        # Asegurar que siempre devolvemos JSON, incluso en caso de error
        logger.error(f"Error al obtener fecha de sincronización: {str(e)}")
        return jsonify({'error': str(e), 'mensaje': 'Error al obtener fecha de sincronización'}), 500

@sync_bp.route('/api/auth/url', methods=['GET'])
def get_auth_url():
    """
    Obtiene la URL de autorización para OAuth2 con Gmail.
    """
    try:
        # Verificar que el archivo client_secret.json existe
        if not os.path.exists("client_secret.json"):
            logger.error("El archivo client_secret.json no existe")
            return jsonify({'error': 'El archivo client_secret.json no existe', 'mensaje': 'Archivo de credenciales no encontrado'}), 500
            
        logger.info("Solicitando URL de autorización")
        auth_url = sync_service.get_auth_url()
        
        if not auth_url:
            logger.error("URL de autorización vacía")
            return jsonify({'error': 'URL de autorización vacía', 'mensaje': 'No se pudo generar la URL de autorización'}), 500
            
        logger.info(f"URL de autorización generada: {auth_url[:50]}...")
        return jsonify({'auth_url': auth_url})
    except Exception as e:
        # Asegurar que siempre devolvemos JSON, incluso en caso de error
        logger.error(f"Error al obtener URL de autenticación: {str(e)}")
        return jsonify({'error': str(e), 'mensaje': 'Error al obtener URL de autenticación'}), 500

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
