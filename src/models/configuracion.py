"""
Modelo para almacenar configuraciones del sistema.
"""
from src.models.database import db
from datetime import datetime

class Configuracion(db.Model):
    """
    Modelo para almacenar configuraciones del sistema.
    """
    __tablename__ = 'configuraciones'
    
    id = db.Column(db.Integer, primary_key=True)
    clave = db.Column(db.String(100), unique=True, nullable=False)
    valor = db.Column(db.Text, nullable=False)
    descripcion = db.Column(db.Text, nullable=True)
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    fecha_actualizacion = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Configuracion {self.clave}>"
    
    def to_dict(self):
        return {
            'id': self.id,
            'clave': self.clave,
            'valor': self.valor,
            'descripcion': self.descripcion,
            'fecha_creacion': self.fecha_creacion.strftime('%Y-%m-%d %H:%M:%S'),
            'fecha_actualizacion': self.fecha_actualizacion.strftime('%Y-%m-%d %H:%M:%S')
        }
        
