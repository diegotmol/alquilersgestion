# Crea un nuevo archivo: src/routes/debug_routes.py

from flask import Blueprint, jsonify, current_app
from src.models.database import db
from sqlalchemy import text
import logging

# Configurar logger
logger = logging.getLogger(__name__)

# Crear blueprint
debug_bp = Blueprint('debug', __name__)

@debug_bp.route('/debug/tabla_inquilinos', methods=['GET'])
def debug_tabla_inquilinos():
    try:
        # Obtener todas las columnas de la tabla
        inspector = db.inspect(db.engine)
        columnas = [col['name'] for col in inspector.get_columns('inquilinos')]
        
        # Consulta directa a la base de datos para obtener todos los datos
        query = text(f"SELECT {', '.join(columnas)} FROM inquilinos")
        result = db.session.execute(query).fetchall()
        
        # Convertir a formato legible
        filas = []
        for fila in result:
            fila_dict = {}
            for i, col in enumerate(columnas):
                fila_dict[col] = str(fila[i])  # Convertir a string para evitar problemas de serialización
            filas.append(fila_dict)
        
        # Imprimir en los logs
        logger.info("=== CONTENIDO COMPLETO DE LA TABLA INQUILINOS ===")
        for fila in filas:
            logger.info(f"Fila: {fila}")
        
        return jsonify({
            "success": True,
            "message": "Tabla inquilinos impresa en los logs",
            "columnas": columnas,
            "datos": filas
        })
    
    except Exception as e:
        logger.error(f"Error al depurar tabla inquilinos: {str(e)}")
        return jsonify({
            "success": False,
            "message": f"Error: {str(e)}"
        }), 500
