import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv

# Cargar variables de entorno desde .env
load_dotenv()

from flask import Flask, send_from_directory, jsonify, request, session
from flask_cors import CORS
from src.models.database import db
from src.routes.user import user_bp
from src.routes.inquilinos import inquilinos_bp
# Módulo pagos_bp no existe, se comenta para evitar error
# from src.routes.pagos import pagos_bp
from src.routes.auth import auth_bp
from src.routes.sync import sync_bp

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
CORS(app)
app.config['SECRET_KEY'] = 'asdf#FGSgvasgf$5$WGT'

app.register_blueprint(user_bp, url_prefix='/api')
app.register_blueprint(inquilinos_bp, url_prefix='/api/inquilinos')
# Comentado porque el módulo pagos_bp no existe
# app.register_blueprint(pagos_bp, url_prefix='/api/pagos')
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(sync_bp, url_prefix='/api/sync')

# Configuración de la base de datos PostgreSQL en Render (URL externa)
database_url = "postgresql://gestion_pagos_user:ZMF1bPMxnsp52UvNPF37sMMY1pLoIwqT@dpg-d0n2s9re5dus73auvbhg-a.oregon-postgres.render.com/gestion_pagos"
app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)
with app.app_context():
    db.create_all()

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    static_folder_path = app.static_folder
    if static_folder_path is None:
            return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
