"""
Rutas para la autenticación con Google OAuth2.
"""

from flask import Blueprint, redirect, request, url_for, session, jsonify
from src.services.gmail_service_real import GmailServiceReal

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login')
def login():
    """
    Inicia el flujo de autenticación con Google.
    
    Returns:
        Redirección a la página de autenticación de Google.
    """
    gmail_service = GmailServiceReal()
    auth_url = gmail_service.get_auth_url()
    return redirect(auth_url)

@auth_bp.route('/callback')
def callback():
    """
    Maneja la respuesta de autenticación de Google.
    
    Returns:
        Redirección a la página principal o mensaje de error.
    """
    auth_code = request.args.get('code')
    if not auth_code:
        return jsonify({"error": "No se recibió código de autorización"}), 400
    
    gmail_service = GmailServiceReal()
    credentials = gmail_service.get_token(auth_code)
    session['credentials'] = credentials
    success = True
    
    if success:
        return redirect('/')
    else:
        return jsonify({"error": "Error en la autenticación"}), 500

@auth_bp.route('/status')
def status():
    """
    Verifica el estado de autenticación del usuario.
    
    Returns:
        JSON con el estado de autenticación.
    """
    is_authenticated = False
    if 'credentials' in session:
        is_authenticated = True
    
    return jsonify({
        "authenticated": is_authenticated
    })

@auth_bp.route('/logout')
def logout():
    """
    Cierra la sesión del usuario.
    
    Returns:
        Redirección a la página principal.
    """
    if 'credentials' in session:
        del session['credentials']
    
    return redirect('/')
