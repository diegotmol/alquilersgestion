"""
Script para actualizar la estructura de la base de datos automáticamente.
Este script añade columnas de pagos mensuales para el año actual y el anterior a la tabla inquilinos.
Está diseñado para ser ejecutado durante la inicialización de la aplicación.
"""
import logging
from datetime import datetime
from sqlalchemy import text, inspect
from sqlalchemy.exc import SQLAlchemyError

# Configurar logging
logger = logging.getLogger(__name__)

def actualizar_columnas_pagos(db):
    """
    Agrega las columnas de pagos mensuales para el año actual y el anterior a la tabla inquilinos.
    
    Args:
        db: Instancia de SQLAlchemy para la base de datos
    
    Returns:
        bool: True si la actualización fue exitosa, False en caso contrario
    """
    try:
        # Obtener el año actual y el anterior
        año_actual = datetime.now().year
        año_anterior = año_actual - 1
        
        logger.info(f"Verificando columnas de pagos para los años {año_anterior} y {año_actual}")
        
        # Obtener el inspector de la base de datos
        inspector = inspect(db.engine)
        
        # Verificar si la tabla inquilinos existe
        if 'inquilinos' not in inspector.get_table_names():
            logger.warning("La tabla 'inquilinos' no existe. No se pueden añadir columnas.")
            return False
        
        # Obtener las columnas existentes
        columnas_existentes = [col['name'] for col in inspector.get_columns('inquilinos')]
        
        # Añadir columnas para el año actual
        for mes in range(1, 13):
            mes_str = f"{mes:02d}"
            columna = f"pago_{mes_str}_{año_actual}"
            
            if columna not in columnas_existentes:
                logger.info(f"Añadiendo columna {columna}...")
                query = text(f"ALTER TABLE inquilinos ADD COLUMN {columna} VARCHAR(20) NOT NULL DEFAULT 'No pagado'")
                db.session.execute(query)
            else:
                logger.info(f"La columna {columna} ya existe.")
        
        # Añadir columnas para el año anterior
        for mes in range(1, 13):
            mes_str = f"{mes:02d}"
            columna = f"pago_{mes_str}_{año_anterior}"
            
            if columna not in columnas_existentes:
                logger.info(f"Añadiendo columna {columna}...")
                query = text(f"ALTER TABLE inquilinos ADD COLUMN {columna} VARCHAR(20) NOT NULL DEFAULT 'No pagado'")
                db.session.execute(query)
            else:
                logger.info(f"La columna {columna} ya existe.")
        
        # Guardar cambios
        db.session.commit()
        logger.info("Estructura de la base de datos actualizada correctamente.")
        return True
    
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"Error al actualizar la estructura de la base de datos: {str(e)}")
        return False
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error inesperado al actualizar la estructura de la base de datos: {str(e)}")
        return False
