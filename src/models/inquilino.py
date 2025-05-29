from sqlalchemy import text, inspect
from src.models.database import db
from datetime import datetime

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
        
        # Método 1: Usar __dict__ (enfoque actual)
        for key, value in self.__dict__.items():
            # Solo incluir columnas de pagos y evitar atributos internos de SQLAlchemy
            if isinstance(key, str) and key.startswith('pago_') and not key.startswith('_'):
                result[key] = value
        
        # Método 2: Consulta directa a la base de datos para asegurar que se incluyan todas las columnas de pago
        try:
            # Obtener todas las columnas de la tabla que empiezan con 'pago_'
            inspector = inspect(db.engine)
            columnas = [col['name'] for col in inspector.get_columns('inquilinos') if col['name'].startswith('pago_')]
            
            if columnas:
                # Consultar los valores de las columnas de pago para este inquilino
                columns_str = ', '.join([f'"{col}"' for col in columnas])
                query = text(f"SELECT {columns_str} FROM inquilinos WHERE id = :id")
                row = db.session.execute(query, {'id': self.id}).fetchone()
                
                if row:
                    # Añadir las columnas de pago al resultado
                    for i, col in enumerate(columnas):
                        # Solo sobrescribir si no existe o es None
                        if col not in result or result[col] is None:
                            result[col] = row[i]
        except Exception as e:
            # Si hay algún error, registrarlo pero continuar con el método 1
            print(f"Error al obtener columnas dinámicas: {e}")
        
        return result
