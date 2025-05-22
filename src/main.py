"""
Aplicación principal de Flask.
"""
from flask import Flask, jsonify, send_from_directory, request
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

# Configuración de la base de datos
database_url = os.getenv('DATABASE_URL')
logger.info(f"DATABASE_URL: {database_url[:20] if database_url else 'No configurado'}")

if database_url and database_url.startswith('postgres://'):
    # Render usa postgres:// pero SQLAlchemy requiere postgresql://
    database_url = database_url.replace('postgres://', 'postgresql://', 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    logger.info(f"Usando PostgreSQL en Render: {database_url[:20]}...")
else:
    # Fallback a SQLite solo si no hay DATABASE_URL
    data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
    os.makedirs(data_dir, exist_ok=True)
    sqlite_path = os.path.join(data_dir, 'alquileres.db')
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{sqlite_path}'
    logger.warning(f"¡ATENCIÓN! Usando SQLite local en: {sqlite_path} - Esto puede causar problemas de sincronización")

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'clave-secreta-por-defecto')

# Inicializar la base de datos
db.init_app(app)

# Configurar la carpeta de archivos estáticos correctamente
static_folder_path = os.path.join(os.path.dirname(__file__), 'static')
app.static_folder = static_folder_path

# Registrar blueprints con prefijos explícitos
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(inquilinos_bp, url_prefix='/api/inquilinos')
app.register_blueprint(sync_bp)  # Este blueprint ya tiene sus propios prefijos
app.register_blueprint(user_bp, url_prefix='/api')

# Aplicar CORS después de registrar los blueprints
CORS(app)

# Ruta específica para favicon.ico
@app.route('/favicon.ico')
def favicon():
    return send_from_directory(app.static_folder, 'favicon.ico', mimetype='image/vnd.microsoft.icon')

# Ruta para la página principal
@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

# Ruta para servir archivos estáticos
@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        # Para SPA (Single Page Application), devuelve index.html para cualquier ruta no encontrada
        return send_from_directory(app.static_folder, 'index.html')

# Manejador de errores 404 para devolver JSON solo para rutas de API
@app.errorhandler(404)
def page_not_found(e):
    if request.path.startswith('/api/'):
        logger.error(f"API ruta no encontrada: {request.path}")
        return jsonify({
            "error": "Ruta de API no encontrada",
            "mensaje": f"La URL solicitada '{request.path}' no existe en el servidor."
        }), 404
    else:
        # Para rutas no-API, devuelve index.html (SPA)
        return send_from_directory(app.static_folder, 'index.html')

# Manejador de errores global para asegurar respuestas JSON para rutas de API
@app.errorhandler(Exception)
def handle_exception(e):
    """Manejador global de excepciones para devolver siempre JSON para rutas de API."""
    logger.error(f"Error no manejado: {str(e)}")
    
    if request.path.startswith('/api/'):
        # Para rutas de API, devuelve JSON
        return jsonify({
            "error": str(e),
            "mensaje": "Error interno del servidor"
        }), 500
    else:
        # Para rutas no-API, intenta devolver index.html
        try:
            return send_from_directory(app.static_folder, 'index.html')
        except:
            return jsonify({
                "error": str(e),
                "mensaje": "Error interno del servidor al servir la página principal"
            }), 500

# Ruta de diagnóstico para verificar la conexión a la base de datos
@app.route('/api/diagnostico/db', methods=['GET'])
def diagnostico_db():
    try:
        # Intentar ejecutar una consulta simple
        with app.app_context():
            result = db.session.execute("SELECT 1").fetchone()
        
        # Obtener información sobre la conexión
        engine = db.engine
        url = str(engine.url)
        # Ocultar credenciales en la URL
        if '@' in url:
            url = url.split('@')[1]
        
        return jsonify({
            "status": "ok",
            "mensaje": "Conexión a la base de datos exitosa",
            "tipo_db": engine.name,
            "url": url,
            "test_query": "SELECT 1 = " + str(result[0])
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "mensaje": f"Error al conectar con la base de datos: {str(e)}",
            "db_url": app.config['SQLALCHEMY_DATABASE_URI'][:20] + "..."
        }), 500

# Crear las tablas si no existen
with app.app_context():
    try:
        db.create_all()
        logger.info("Base de datos inicializada correctamente")
    except Exception as e:
        logger.error(f"Error al inicializar la base de datos: {str(e)}")

if __name__ == '__main__':
    app.run(debug=True)
