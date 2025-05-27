from src.models.database import db
from datetime import datetime
import re

class Inquilino(db.Model):
    __tablename__ = 'inquilinos'
    
    id = db.Column(db.Integer, primary_key=True)
    propietario = db.Column(db.String(100), nullable=False)
    propiedad = db.Column(db.String(100), nullable=False)
    telefono = db.Column(db.String(20), nullable=False)
    rut = db.Column(db.String(20), nullable=True)
    monto = db.Column(db.Float, nullable=False)
    estado_pago = db.Column(db.String(20), default='No pagado')
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    ultima_actualizacion = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        # Crear el diccionario base con los campos estándar
        result = {
            'id': self.id,
            'propietario': self.propietario,
            'propiedad': self.propiedad,
            'telefono': self.telefono,
            'rut': self.rut,
            'monto': self.monto,
            'estado_pago': self.estado_pago,
            'fecha_creacion': self.fecha_creacion.strftime('%Y-%m-%d %H:%M:%S'),
            'ultima_actualizacion': self.ultima_actualizacion.strftime('%Y-%m-%d %H:%M:%S')
        }
        
        # Añadir dinámicamente todas las columnas de pagos mensuales
        # Usamos dir() en lugar de __dict__ para evitar problemas con caracteres especiales
        for key in dir(self):
            # Verificar si es un atributo de pago mensual y no es un método o atributo privado
            if key.startswith('pago_') and not key.startswith('_') and not callable(getattr(self, key)):
                result[key] = getattr(self, key)
        
        return result
