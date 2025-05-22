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
                'mensaje': 'Archivo de credenciales no encontrado',
                'ruta_buscada': client_secrets_file,
                'directorio_actual': os.getcwd(),
                'archivos_disponibles': os.listdir(os.getcwd())
            }), 500
        
        logger.info("Archivo client_secret.json encontrado, llamando a sync_service.get_auth_url()")
        
        # Intentar generar la URL de autorización
        auth_url = None
        try:
            auth_url = sync_service.get_auth_url()
            logger.info(f"Valor devuelto por sync_service.get_auth_url(): {type(auth_url)}")
        except Exception as e:
            error_msg = f"Error en sync_service.get_auth_url(): {str(e)}"
            logger.error(error_msg)
            return jsonify({
                'error': str(e),
                'mensaje': 'Error al generar la URL de autorización',
                'tipo_error': type(e).__name__
            }), 500
        
        # Verificar explícitamente que la URL no sea None o vacía
        if not auth_url:
            error_msg = "URL de autorización vacía o None"
            logger.error(error_msg)
            return jsonify({
                'error': error_msg,
                'mensaje': 'No se pudo generar la URL de autorización',
                'valor_recibido': str(auth_url)
            }), 500
        
        logger.info(f"URL de autorización generada correctamente: {auth_url[:50]}...")
        response_data = {'auth_url': auth_url}
        logger.info(f"Devolviendo respuesta JSON: {response_data}")
        return jsonify(response_data)
        
    except Exception as e:
        # Asegurar que siempre devolvemos JSON, incluso en caso de error
        error_msg = f"Error no manejado en get_auth_url: {str(e)}"
        logger.error(error_msg)
        return jsonify({
            'error': str(e),
            'mensaje': 'Error al obtener URL de autenticación',
            'tipo_error': type(e).__name__,
            'traza': str(e.__traceback__)
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
