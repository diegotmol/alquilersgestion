from src.models.database import db
from datetime import datetime
from sqlalchemy import inspect

class Inquilino(db.Model):
    __tablename__ = 'inquilinos'
    
    id = db.Column(db.Integer, primary_key=True)
    propietario = db.Column(db.String(100), nullable=False)
    propiedad = db.Column(db.String(100), nullable=False)
    telefono = db.Column(db.String(20), nullable=False)
    monto = db.Column(db.Float, nullable=False)
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    ultima_actualizacion = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        # Crear el diccionario base con los campos estándar
        result = {
            'id': self.id,
            'propietario': self.propietario,
            'propiedad': self.propiedad,
            'telefono': self.telefono,
            'monto': self.monto,
            'fecha_creacion': self.fecha_creacion.strftime('%Y-%m-%d %H:%M:%S'),
            'ultima_actualizacion': self.ultima_actualizacion.strftime('%Y-%m-%d %H:%M:%S')
        }
        
        # Añadir dinámicamente todas las columnas de pagos mensuales
        # Obtener todas las columnas de la tabla
        inspector = inspect(db.engine)
        columnas = inspector.get_columns('inquilinos')
        
        # Añadir columnas dinámicas de pagos
        for columna in columnas:
            nombre_columna = columna['name']
            if nombre_columna.startswith('pago_'):
                # Usar getattr para acceder al valor de la columna dinámica
                # Si la columna no existe en el objeto, devuelve None
                valor = getattr(self, nombre_columna, None)
                result[nombre_columna] = valor
        
        return result
