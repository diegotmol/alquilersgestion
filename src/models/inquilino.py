from src.models.database import db
from datetime import datetime
from sqlalchemy import inspect, text

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
        # Versión base con campos estándar
        result = {
            'id': self.id,
            'propietario': self.propietario,
            'propiedad': self.propiedad,
            'telefono': self.telefono,
            'monto': self.monto,
            'fecha_creacion': self.fecha_creacion.strftime('%Y-%m-%d %H:%M:%S'),
            'ultima_actualizacion': self.ultima_actualizacion.strftime('%Y-%m-%d %H:%M:%S')
        }
        
        # Añadir todas las columnas dinámicas de pagos
        inspector = inspect(db.engine)
        columnas = [col['name'] for col in inspector.get_columns('inquilinos')]
        
        # Consulta SQL directa para obtener todas las columnas del inquilino
        sql = text(f"SELECT * FROM inquilinos WHERE id = {self.id}")
        row = db.session.execute(sql).fetchone()
        
        if row:
            # Añadir todas las columnas que empiezan con 'pago_'
            for col in columnas:
                if col.startswith('pago_'):
                    result[col] = row[col]
                    print(f"Añadiendo columna {col} con valor {row[col]}")
        
        return result


