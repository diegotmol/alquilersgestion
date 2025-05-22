from flask import Blueprint, request, jsonify
from datetime import datetime
from src.models.user import User, db

user_bp = Blueprint('user', __name__)

@user_bp.route('/status', methods=['GET'])
def status():
    return jsonify({"status": "ok", "message": "API funcionando correctamente"})

@user_bp.route('/auth/google', methods=['POST'])
def auth_google():
    """Simula la autenticación con Google"""
    data = request.json
    email = data.get('email')
    
    if not email:
        return jsonify({"error": "Email es requerido"}), 400
    
    # Buscar usuario existente o crear uno nuevo
    user = User.query.filter_by(email=email).first()
    if not user:
        user = User(email=email, name=data.get('name'))
        db.session.add(user)
    
    # Actualizar fecha de última sincronización
    user.last_sync = datetime.utcnow()
    db.session.commit()
    
    return jsonify(user.to_dict())

@user_bp.route('/sync/email', methods=['POST'])
def sync_email():
    """Simula la sincronización de correos para verificar pagos"""
    data = request.json
    email = data.get('email')
    mes = data.get('mes')
    
    if not email or not mes:
        return jsonify({"error": "Email y mes son requeridos"}), 400
    
    # En una implementación real, aquí se conectaría con la API de Gmail
    # y se verificarían los correos según los criterios especificados
    
    # Por ahora, devolvemos una respuesta simulada
    return jsonify({
        "success": True,
        "message": "Sincronización completada",
        "fecha_sincronizacion": datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S'),
        "mes_verificado": mes
    })
