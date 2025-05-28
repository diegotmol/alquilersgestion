from src.models.database import db
from datetime import datetime
from sqlalchemy import text, inspect

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
        
        try:
            # Método alternativo: usar inspector para obtener nombres de columnas
            inspector = inspect(db.engine)
            columnas = [col['name'] for col in inspector.get_columns('inquilinos')]
            
            # Obtener todas las columnas dinámicas directamente con SQL
            sql = f"SELECT * FROM inquilinos WHERE id = {self.id}"
            connection = db.engine.connect()
            row = connection.execute(text(sql)).fetchone()
            connection.close()
            
            # Si se encontró el registro, añadir todas las columnas dinámicas
            if row:
                # Iterar por los nombres de columnas conocidos
                for col_name in columnas:
                    if col_name.startswith('pago_'):
                        # Acceder al valor por índice
                        try:
                            idx = columnas.index(col_name)
                            result[col_name] = row[idx]
                        except (IndexError, KeyError) as e:
                            print(f"Error al acceder a columna {col_name}: {str(e)}")
        except Exception as e:
            # Registrar el error pero no interrumpir la serialización
            print(f"Error al obtener columnas dinámicas: {str(e)}")
        
        return result
