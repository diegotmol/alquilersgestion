"""
Modelo para almacenar información de inquilinos con pagos mensuales por año.
"""
from src.models.database import db
from datetime import datetime

class Inquilino(db.Model):
    __tablename__ = 'inquilinos'
    
    id = db.Column(db.Integer, primary_key=True)
    propietario = db.Column(db.String(100), nullable=False)
    propiedad = db.Column(db.String(100), nullable=False)
    telefono = db.Column(db.String(20), nullable=False)
    rut = db.Column(db.String(20), nullable=True)  # Campo RUT
    monto = db.Column(db.Float, nullable=False)
    estado_pago = db.Column(db.String(20), default='No pagado')  # Se mantiene por compatibilidad
    
    # Columnas para pagos mensuales 2025
    pago_01_2025 = db.Column(db.String(20), default='No pagado')
    pago_02_2025 = db.Column(db.String(20), default='No pagado')
    pago_03_2025 = db.Column(db.String(20), default='No pagado')
    pago_04_2025 = db.Column(db.String(20), default='No pagado')
    pago_05_2025 = db.Column(db.String(20), default='No pagado')
    pago_06_2025 = db.Column(db.String(20), default='No pagado')
    pago_07_2025 = db.Column(db.String(20), default='No pagado')
    pago_08_2025 = db.Column(db.String(20), default='No pagado')
    pago_09_2025 = db.Column(db.String(20), default='No pagado')
    pago_10_2025 = db.Column(db.String(20), default='No pagado')
    pago_11_2025 = db.Column(db.String(20), default='No pagado')
    pago_12_2025 = db.Column(db.String(20), default='No pagado')
    
    # Columnas para pagos mensuales 2026
    pago_01_2026 = db.Column(db.String(20), default='No pagado')
    pago_02_2026 = db.Column(db.String(20), default='No pagado')
    pago_03_2026 = db.Column(db.String(20), default='No pagado')
    pago_04_2026 = db.Column(db.String(20), default='No pagado')
    pago_05_2026 = db.Column(db.String(20), default='No pagado')
    pago_06_2026 = db.Column(db.String(20), default='No pagado')
    pago_07_2026 = db.Column(db.String(20), default='No pagado')
    pago_08_2026 = db.Column(db.String(20), default='No pagado')
    pago_09_2026 = db.Column(db.String(20), default='No pagado')
    pago_10_2026 = db.Column(db.String(20), default='No pagado')
    pago_11_2026 = db.Column(db.String(20), default='No pagado')
    pago_12_2026 = db.Column(db.String(20), default='No pagado')
    
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    ultima_actualizacion = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        """
        Convierte el objeto a un diccionario.
        Incluye todos los campos de pago mensuales para los años disponibles.
        """
        # Obtener el año actual para determinar qué columnas incluir
        año_actual = datetime.now().year
        
        # Diccionario base con campos comunes
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
        
        # Añadir todos los campos de pago disponibles
        for año in range(año_actual - 1, año_actual + 1):  # Incluir año actual y anterior
            for mes in range(1, 13):
                mes_str = f"{mes:02d}"
                campo = f"pago_{mes_str}_{año}"
                if hasattr(self, campo):
                    result[campo] = getattr(self, campo)
        
        return result
    
    def get_estado_pago(self, mes, año):
        """
        Obtiene el estado de pago para un mes y año específicos.
        
        Args:
            mes (str): Mes en formato '01', '02', etc.
            año (str): Año en formato '2025', '2026', etc.
            
        Returns:
            str: Estado de pago ('Pagado' o 'No pagado')
        """
        campo = f"pago_{mes}_{año}"
        if hasattr(self, campo):
            return getattr(self, campo)
        return "No pagado"
    
    def set_estado_pago(self, mes, año, estado):
        """
        Establece el estado de pago para un mes y año específicos.
        
        Args:
            mes (str): Mes en formato '01', '02', etc.
            año (str): Año en formato '2025', '2026', etc.
            estado (str): Estado de pago ('Pagado' o 'No pagado')
            
        Returns:
            bool: True si se actualizó correctamente, False si no existe el campo
        """
        campo = f"pago_{mes}_{año}"
        if hasattr(self, campo):
            setattr(self, campo, estado)
            return True
        return False
