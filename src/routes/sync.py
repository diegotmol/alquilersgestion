"""
Rutas para la sincronización de correos electrónicos.
"""
from flask import Blueprint, request, jsonify, session, redirect, url_for
from src.services.sync_service import SyncService
from src.models.configuracion import Configuracion
from src.models.database import db

sync_bp = Blueprint('sync', __name__)
sync_service = SyncService()

@sync_bp.route('/api/sync/emails', methods=['POST'])
def sync_emails():
    """
    Sincroniza los correos electrónicos con Gmail y actualiza el estado de pago.
    """
    data = request.json
    credentials = data.get('credentials')
    mes = data.get('mes')
    
    if not credentials:
        return jsonify({'error': 'No se proporcionaron credenciales'}), 400
    
    result = sync_service.sync_emails(credentials, mes)
    return jsonify(result)

@sync_bp.route('/api/sync/last', methods=['GET'])
def get_last_sync():
    """
    Obtiene la fecha de la última sincronización.
    """
    # Buscar la configuración de última sincronización
    config = Configuracion.query.filter_by(clave='ultima_sincronizacion').first()
    
    if config:
        return jsonify({
            'fecha_sincronizacion': config.valor,
            'mensaje': f'Última sincronización: {config.valor}'
        })
    else:
        return jsonify({
            'fecha_sincronizacion': None,
            'mensaje': 'No hay registros de sincronización'
        })

@sync_bp.route('/api/auth/url', methods=['GET'])
def get_auth_url():
    """
    Obtiene la URL de autorización para OAuth2 con Gmail.
    """
    auth_url = sync_service.get_auth_url()
    return jsonify({'auth_url': auth_url})

@sync_bp.route('/callback')
def auth_callback():
    """
    Callback para la autorización de OAuth2 con Gmail.
    """
    code = request.args.get('code')
    if not code:
        return redirect('/')
    
    credentials = sync_service.process_auth_callback(code)
    
    # Redirigir a la página principal con las credenciales como parámetro
    credentials_str = str(credentials).replace("'", '"')
    return redirect(f'/?credentials={credentials_str}')
