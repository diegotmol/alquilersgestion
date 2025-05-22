"""
Ruta para manejar la sincronización de correos y actualización de pagos.
"""

from flask import Blueprint, jsonify, request, session
from src.services.sync_service import SyncService

sync_bp = Blueprint('sync', __name__)

@sync_bp.route('/sincronizar', methods=['POST'])
def sincronizar_correos():
    """
    Sincroniza los correos de transferencias y actualiza el estado de pago de los inquilinos.
    
    Returns:
        JSON con los resultados de la sincronización.
    """
    # Obtener el mes seleccionado del request (opcional)
    data = request.json or {}
    selected_month = data.get('mes')
    
    # Convertir a entero si es un string numérico
    if selected_month and selected_month.isdigit():
        selected_month = int(selected_month)
    elif selected_month == 'todos':
        selected_month = None
    
    # Verificar si hay credenciales en la sesión
    if 'credentials' not in session:
        return jsonify({"error": "No hay credenciales de autenticación"}), 401
    
    # Obtener el servicio de sincronización
    sync_service = SyncService()
    
    # Realizar la sincronización usando las credenciales de la sesión
    results = sync_service.sync_emails(session['credentials'], selected_month)
    
    return jsonify(results)
