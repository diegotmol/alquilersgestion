"""
Aplicación principal de Flask.
"""
from flask import Flask, jsonify
from flask_cors import CORS
import os
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Importar blueprints
from src.routes.auth import auth_bp
from src.routes.inquilinos import inquilinos_bp
from src.routes.sync import sync_bp
from src.routes.user import user_bp
from src.models.database import db

app = Flask(__name__)
CORS(app)

# Configuración de la base de datos
# Configuración de la base de datos PostgreSQL en Render (URL externa)
database_url = "postgresql://gestion_pagos_user:ZMF1bPMxnsp52UvNPF37sMMY1pLoIwqT@dpg-d0n2s9re5dus73auvbhg-a.oregon-postgres.render.com/gestion_pagos"
app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'clave-secreta-por-defecto')

# Inicializar la base de datos
db.init_app(app)

# Registrar blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(inquilinos_bp)
app.register_blueprint(sync_bp)
app.register_blueprint(user_bp)

# Manejador de errores global para asegurar respuestas JSON
@app.errorhandler(Exception)
def handle_exception(e):
    """Manejador global de excepciones para devolver siempre JSON."""
    logger.error(f"Error no manejado: {str(e)}")
    return jsonify({
        "error": str(e),
        "mensaje": "Error interno del servidor"
    }), 500

# Crear las tablas si no existen
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True)
