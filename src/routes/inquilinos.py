"""
Ruta API corregida para obtener inquilinos con todas las columnas dinámicas de pagos.
Esta versión asegura que todas las columnas de pagos mensuales se incluyan en la respuesta.
"""
from flask import Blueprint, jsonify
from src.models.inquilino import Inquilino
from src.models.database import db
from sqlalchemy import inspect

# Crear el blueprint
inquilinos_bp = Blueprint('inquilinos', __name__)

@inquilinos_bp.route('/', methods=['GET'])
def get_inquilinos():
    """
    Obtiene todos los inquilinos con sus datos completos, incluyendo todas las columnas de pagos.
    """
    try:
        # Obtener todos los inquilinos
        inquilinos = Inquilino.query.all()
        
        # Obtener todas las columnas de la tabla inquilinos
        inspector = inspect(db.engine)
        columnas = [col['name'] for col in inspector.get_columns('inquilinos')]
        
        # Filtrar las columnas de pagos (formato: pago_MM_YYYY)
        columnas_pagos = [col for col in columnas if col.startswith('pago_')]
        
        # Crear la lista de resultados
        resultado = []
        for inquilino in inquilinos:
            # Convertir el inquilino a diccionario
            inquilino_dict = {
                'id': inquilino.id,
                'propietario': inquilino.propietario,
                'telefono': inquilino.telefono,
                'monto': inquilino.monto,
                'rut': inquilino.rut if hasattr(inquilino, 'rut') else None
            }
            
            # Añadir todas las columnas de pagos dinámicamente
            for col in columnas_pagos:
                if hasattr(inquilino, col):
                    inquilino_dict[col] = getattr(inquilino, col)
                else:
                    inquilino_dict[col] = 'No pagado'  # Valor por defecto
            
            resultado.append(inquilino_dict)
        
        return jsonify(resultado)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
