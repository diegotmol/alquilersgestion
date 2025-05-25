""" Servicio para la sincronización de correos electrónicos con gestión automática de columnas por año. """
import logging
from datetime import datetime
import pytz  # Necesitamos importar pytz para manejar zonas horarias
import re  # Para extraer información de los correos
from sqlalchemy import inspect, text
from src.services.gmail_service_real import GmailServiceReal
from src.models.configuracion import Configuracion
from src.models.inquilino import Inquilino
from src.models.database import db

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SyncService:
    def __init__(self):
        self.gmail_service = GmailServiceReal()

    def sync_emails(self, credentials, mes=None, año=None):
        """
        Sincroniza los correos electrónicos con Gmail y actualiza el estado de pago.
        
        Args:
            credentials (dict): Credenciales de acceso a Gmail
            mes (str, optional): Mes para filtrar correos (formato '01', '02', etc.). Por defecto None.
            año (str, optional): Año para filtrar correos (formato '2025', '2026'). Por defecto año actual.
            
        Returns:
            dict: Resultado de la sincronización
        """
        try:
            # Verificar y actualizar esquema si es necesario
            self.verificar_y_actualizar_esquema()
            
            # Si no se especifica año, usar el año actual
            if not año:
                año = str(datetime.now().year)
                
            # Mantener la consulta original rígida como lo solicitó el usuario
            query = "subject:Comprobante de pago"
            if mes:
                query += f" AND subject:{mes}"
                
            logger.info(f"Ejecutando búsqueda con query: {query}")
            
            # Obtener correos
            emails = self.gmail_service.get_emails(credentials, query=query)
            
            logger.info(f"Se encontraron {len(emails)} correos que coinciden con la búsqueda")
            
            # Procesar correos y actualizar estado de pago
            transferencias_procesadas = 0
            for email in emails:
                # Aquí iría la lógica para extraer información del correo
                # y determinar a qué inquilino corresponde el pago
                
                # Ejemplo simplificado:
                # Supongamos que el asunto del correo contiene el nombre del propietario
                asunto = email.get('subject', '')
                
                # Buscar inquilino por nombre en el asunto (simplificado)
                # En una implementación real, se usaría una lógica más robusta
                inquilinos = Inquilino.query.all()
                for inquilino in inquilinos:
                    if inquilino.propietario.lower() in asunto.lower():
                        # Actualizar el estado de pago para el mes y año específicos
                        if mes:
                            mes_formato = mes  # Ya está en formato '01', '02', etc.
                        else:
                            # Extraer mes del correo o usar el mes actual
                            # Esto es un ejemplo simplificado
                            mes_actual = datetime.now().month
                            mes_formato = f"{mes_actual:02d}"
                        
                        # Actualizar el campo específico para ese mes y año
                        campo = f"pago_{mes_formato}_{año}"
                        if hasattr(inquilino, campo):
                            setattr(inquilino, campo, "Pagado")
                            # También actualizar el campo estado_pago por compatibilidad
                            inquilino.estado_pago = "Pagado"
                            db.session.add(inquilino)
                            transferencias_procesadas += 1
                            logger.info(f"Actualizado estado de pago para {inquilino.propietario}, {campo}")
            
            # Guardar cambios en la base de datos
            db.session.commit()
            
            # Actualizar fecha de última sincronización - USAR UTC EXPLÍCITAMENTE
            now = datetime.now(pytz.UTC)
            logger.info(f"Actualizando fecha de última sincronización a: {now}")
            
            # Buscar configuración existente o crear una nueva
            config = Configuracion.query.filter_by(clave="ultima_sincronizacion").first()
            
            if not config:
                # Crear nueva configuración
                config = Configuracion(
                    clave="ultima_sincronizacion",
                    valor=now.isoformat(),
                    descripcion="Fecha de la última sincronización de correos"
                )
                logger.info("Creando nueva configuración para última sincronización")
            else:
                # Actualizar configuración existente
                config.valor = now.isoformat()
                logger.info("Actualizando configuración existente para última sincronización")
            
            # Guardar en la base de datos
            db.session.add(config)
            db.session.commit()
            
            logger.info(f"Fecha de última sincronización guardada: {config.valor}")
            
            return {
                "success": True,
                "mensaje": f"Se encontraron {transferencias_procesadas} transferencias",
                "transferencias": transferencias_procesadas,
                "fecha_sincronizacion": now.isoformat()  # Incluir la fecha en la respuesta
            }
        except Exception as e:
            logger.error(f"Error en sincronización: {str(e)}")
            return {
                "success": False,
                "mensaje": f"Error en sincronización: {str(e)}",
                "transferencias": 0
            }
    
    def verificar_y_actualizar_esquema(self):
        """
        Verifica si es necesario actualizar el esquema para un nuevo año.
        Esta función se ejecuta automáticamente durante la sincronización.
        
        Returns:
            bool: True si se actualizó el esquema, False si no era necesario
        """
        try:
            año_actual = datetime.now().year
            
            # Verificar si ya existen columnas para el año actual
            inspector = inspect(db.engine)
            columnas = inspector.get_columns('inquilinos')
            nombres_columnas = [col['name'] for col in columnas]
            
            # Buscar si existe al menos una columna para el año actual
            columna_ejemplo = f"pago_01_{año_actual}"
            
            if columna_ejemplo not in nombres_columnas:
                logger.info(f"Detectado nuevo año: {año_actual}. Actualizando esquema...")
                
                # Crear nuevas columnas para el año actual
                with db.engine.begin() as conn:
                    for mes in range(1, 13):
                        mes_str = f"{mes:02d}"
                        conn.execute(text(
                            f"ALTER TABLE inquilinos ADD COLUMN pago_{mes_str}_{año_actual} "
                            f"VARCHAR(20) NOT NULL DEFAULT 'No pagado'"
                        ))
                
                # Eliminar columnas de hace 2 años si existen
                año_antiguo = año_actual - 2
                columna_ejemplo_antigua = f"pago_01_{año_antiguo}"
                
                if columna_ejemplo_antigua in nombres_columnas:
                    logger.info(f"Eliminando columnas del año {año_antiguo}...")
                    with db.engine.begin() as conn:
                        for mes in range(1, 13):
                            mes_str = f"{mes:02d}"
                            conn.execute(text(
                                f"ALTER TABLE inquilinos DROP COLUMN IF EXISTS pago_{mes_str}_{año_antiguo}"
                            ))
                
                logger.info("Esquema actualizado correctamente")
                return True
            
            return False
        except Exception as e:
            logger.error(f"Error al verificar/actualizar esquema: {str(e)}")
            return False
    
    def get_last_sync(self):
        """
        Obtiene la fecha de la última sincronización.
        
        Returns:
            dict: Información sobre la última sincronización
        """
        try:
            # Buscar la configuración por clave
            config = Configuracion.query.filter_by(clave="ultima_sincronizacion").first()
            
            if config and config.valor:
                logger.info(f"Fecha de última sincronización encontrada: {config.valor}")
                return {
                    "success": True,
                    "fecha_sincronizacion": config.valor
                }
                
            logger.info("No se encontró fecha de última sincronización")
            return {
                "success": False,
                "mensaje": "No hay registros de sincronización previa"
            }
        except Exception as e:
            logger.error(f"Error al obtener última sincronización: {str(e)}")
            raise
    
    def process_auth_callback(self, code):
        """
        Procesa el callback de autorización de OAuth2 con Gmail.
        
        Args:
            code (str): Código de autorización
            
        Returns:
            dict: Credenciales de acceso
        """
        try:
            return self.gmail_service.get_token(code)
        except Exception as e:
            logger.error(f"Error en callback de autorización: {str(e)}")
            raise
