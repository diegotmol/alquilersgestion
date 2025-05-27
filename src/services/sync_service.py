"""
Servicio para la sincronización de correos electrónicos y actualización de pagos mensuales.
"""
import logging
from datetime import datetime
import pytz  # Necesitamos importar pytz para manejar zonas horarias
from src.services.gmail_service_real import GmailServiceReal
from src.services.email_parser import EmailParser
from src.models.configuracion import Configuracion
from src.models.inquilino import Inquilino
from src.models.database import db
from sqlalchemy import text

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SyncService:
    def __init__(self):
        self.gmail_service = GmailServiceReal()
        self.email_parser = EmailParser()

    def sync_emails(self, credentials, mes=None, año=None):
        """
        Sincroniza los correos electrónicos con Gmail y actualiza el estado de pago.
        
        Args:
            credentials (dict): Credenciales de acceso a Gmail
            mes (str, optional): Mes para filtrar correos (formato: 01-12)
            año (str, optional): Año para filtrar correos (formato: YYYY)
            
        Returns:
            dict: Resultado de la sincronización
        """
        try:
            # Usar búsqueda por remitente en lugar de asunto
            query = "from:serviciodetransferencias@bancochile.cl"
            
            logger.info(f"Iniciando sincronización con credenciales: {credentials.keys() if credentials else 'No hay credenciales'}")
            logger.info(f"Mes seleccionado: {mes}, Año seleccionado: {año}")
            logger.info(f"Ejecutando búsqueda con query: {query}")
            
            # Obtener correos
            emails = self.gmail_service.get_emails(credentials, query=query)
            
            logger.info(f"Se encontraron {len(emails)} correos del servicio de transferencias.")
            if len(emails) > 0:
                logger.info(f"Muestra del primer correo: {list(emails[0].keys())}")
            
            # Procesar cada correo para actualizar pagos
            pagos_actualizados = 0
            for email in emails:
                # Parsear el correo para extraer información
                transfer_data = self.email_parser.parse_banco_chile_email(email)
                
                if transfer_data:
                    logger.info(f"Datos extraídos del correo: {transfer_data}")
                    
                    # Si se especificó un mes, verificar si coincide con el mes de la transferencia
                    if mes and mes != 'todos' and 'fecha' in transfer_data:
                        mes_transferencia = f"{transfer_data['fecha'].month:02d}"
                        logger.info(f"Comparando mes seleccionado: {mes} con mes de transferencia: {mes_transferencia}")
                        if mes != mes_transferencia:
                            logger.info(f"Mes no coincide, saltando este correo")
                            continue
                    
                    # Actualizar el estado de pago del inquilino correspondiente
                    actualizado = self._actualizar_pago_inquilino(transfer_data, mes, año)
                    if actualizado:
                        pagos_actualizados += 1
            
            # Actualizar fecha de última sincronización - USAR UTC EXPLÍCITAMENTE
            # Usando pytz en lugar de datetime.timezone
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
                "mensaje": f"Se encontraron {len(emails)} transferencias. Se actualizaron {pagos_actualizados} pagos.",
                "emails": len(emails),
                "pagos_actualizados": pagos_actualizados,
                "fecha_sincronizacion": now.isoformat()  # Incluir la fecha en la respuesta
            }
        except Exception as e:
            logger.error(f"Error en sincronización: {str(e)}")
            return {
                "success": False,
                "mensaje": f"Error en sincronización: {str(e)}",
                "emails": 0,
                "pagos_actualizados": 0
            }
    
    def _actualizar_pago_inquilino(self, transfer_data, mes_seleccionado=None, año_seleccionado=None):
        """
        Actualiza el estado de pago de un inquilino basado en los datos de transferencia.
        
        Args:
            transfer_data (dict): Datos extraídos del correo de transferencia
            mes_seleccionado (str, optional): Mes seleccionado por el usuario (formato: 01-12)
            año_seleccionado (str, optional): Año seleccionado por el usuario (formato: YYYY)
            
        Returns:
            bool: True si se actualizó algún pago, False en caso contrario
        """
        try:
            # Verificar que tenemos los datos necesarios
            logger.info(f"Datos de transferencia completos: {transfer_data}")
            
            if not transfer_data or 'emisor' not in transfer_data:
                logger.warning("Datos de transferencia incompletos, no se puede actualizar pago")
                return False
            
            # Obtener el nombre del emisor (quien hizo la transferencia)
            emisor_original = transfer_data.get('emisor', '').strip()
            emisor = emisor_original.lower()
            logger.info(f"Emisor original: '{emisor_original}', normalizado: '{emisor}'")
            
            if not emisor:
                logger.warning("Emisor no encontrado en los datos de transferencia")
                return False
            
            # Buscar inquilino por nombre
            inquilinos = Inquilino.query.all()
            logger.info(f"Total de socios en base de datos: {len(inquilinos)}")
            
            inquilino_encontrado = None
            for inquilino in inquilinos:
                nombre_original = inquilino.propietario
                nombre_inquilino = nombre_original.lower()
                logger.info(f"Comparando con socio: '{nombre_original}', normalizado: '{nombre_inquilino}'")
                
                # Probar comparación exacta primero
                if nombre_inquilino == emisor:
                    logger.info(f"¡COINCIDENCIA EXACTA! Socio encontrado: {nombre_original}")
                    inquilino_encontrado = inquilino
                    break
                    
                # Si no hay coincidencia exacta, probar parcial
                if nombre_inquilino in emisor or emisor in nombre_inquilino:
                    logger.info(f"Coincidencia parcial encontrada: {nombre_original}")
                    inquilino_encontrado = inquilino
                    break
            
            if not inquilino_encontrado:
                logger.warning(f"No se encontró socio para el emisor: {emisor_original}")
                return False
            
            # Determinar el mes y año para la columna a actualizar
            if 'fecha' in transfer_data and isinstance(transfer_data['fecha'], datetime):
                # Usar el mes y año de la transferencia
                mes = transfer_data['fecha'].month
                año = transfer_data['fecha'].year
                logger.info(f"Usando fecha de transferencia: {mes}/{año}")
            else:
                # Si no hay fecha en la transferencia, usar el mes y año seleccionados
                # o el mes y año actuales como respaldo
                mes = int(mes_seleccionado) if mes_seleccionado and mes_seleccionado != 'todos' else datetime.now().month
                año = int(año_seleccionado) if año_seleccionado else datetime.now().year
                logger.info(f"Usando fecha seleccionada/actual: {mes}/{año}")
            
            # Formatear el mes con dos dígitos
            mes_str = f"{mes:02d}"
            
            # Nombre de la columna a actualizar
            columna = f"pago_{mes_str}_{año}"
            logger.info(f"Intentando actualizar columna: {columna}")
            
            # Verificar si la columna existe
            try:
                # Usar SQLAlchemy para actualizar la columna dinámicamente
                # Primero verificar si la columna existe
                inspector = db.inspect(db.engine)
                columnas_existentes = [col['name'] for col in inspector.get_columns('inquilinos')]
                logger.info(f"Columnas existentes: {columnas_existentes}")
                
                if columna not in columnas_existentes:
                    logger.warning(f"La columna {columna} no existe en la tabla inquilinos")
                    # Intentar crear la columna si no existe
                    try:
                        query = text(f"ALTER TABLE inquilinos ADD COLUMN {columna} VARCHAR(20) NOT NULL DEFAULT 'No pagado'")
                        db.session.execute(query)
                        db.session.commit()
                        logger.info(f"Columna {columna} creada correctamente")
                    except Exception as e:
                        logger.error(f"Error al crear la columna {columna}: {str(e)}")
                        return False
                
                # Actualizar el estado de pago en la columna correspondiente
                query = text(f"UPDATE inquilinos SET {columna} = 'Pagado' WHERE id = :id")
                db.session.execute(query, {"id": inquilino_encontrado.id})
                db.session.commit()
                
                logger.info(f"Actualizado estado de pago para {inquilino_encontrado.propietario} en columna {columna}")
                return True
                
            except Exception as e:
                logger.error(f"Error al actualizar estado de pago: {str(e)}")
                db.session.rollback()
                return False
                
        except Exception as e:
            logger.error(f"Error en _actualizar_pago_inquilino: {str(e)}")
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
