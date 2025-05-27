"""
Servicio para la sincronización de correos electrónicos y actualización de pagos mensuales.
Versión modificada para filtrar por fecha de recepción del correo.
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
            # Modificar la consulta para buscar por remitente en lugar de asunto
            query = "from:serviciodetransferencias@bancochile.cl"
            
            logger.info(f"Ejecutando búsqueda con query: {query}")
            logger.info(f"Filtrando por mes: {mes}, año: {año}")
            
            # Obtener correos
            emails = self.gmail_service.get_emails(credentials, query=query)
            
            logger.info(f"Se encontraron {len(emails)} correos del servicio de transferencias.")
            
            # Si se especificó un mes, filtrar los correos por la fecha de RECEPCIÓN
            if mes and mes != 'todos':
                emails_filtrados = []
                for email in emails:
                    # Extraer la fecha de recepción del correo
                    fecha_recepcion = None
                    if 'internalDate' in email:
                        try:
                            # internalDate es un timestamp en milisegundos
                            timestamp_ms = int(email['internalDate'])
                            fecha_recepcion = datetime.fromtimestamp(timestamp_ms/1000.0)
                            mes_recepcion = f"{fecha_recepcion.month:02d}"
                            año_recepcion = fecha_recepcion.year
                            
                            logger.info(f"Correo recibido en: {fecha_recepcion}, Mes: {mes_recepcion}, Año: {año_recepcion}")
                            
                            # Filtrar por mes de recepción y opcionalmente por año
                            if mes_recepcion == mes:
                                # Si se especificó un año, verificar también el año
                                if año and int(año) != año_recepcion:
                                    logger.info(f"Año no coincide: {año} != {año_recepcion}")
                                    continue
                                
                                emails_filtrados.append(email)
                                logger.info(f"Correo añadido a filtrados por fecha de recepción")
                                continue
                        except Exception as e:
                            logger.error(f"Error al procesar fecha de recepción: {str(e)}")
                    
                    # Si no se pudo filtrar por fecha de recepción, intentar con la fecha de la transferencia
                    # como método de respaldo
                    transfer_data = self.email_parser.parse_banco_chile_email(email)
                    if transfer_data and 'mes' in transfer_data:
                        mes_correo = f"{transfer_data['mes']:02d}"
                        año_correo = transfer_data['año']
                        
                        logger.info(f"Transferencia de: {mes_correo}/{año_correo}")
                        
                        if mes_correo == mes:
                            # Si se especificó un año, verificar también el año
                            if año and int(año) != año_correo:
                                logger.info(f"Año no coincide: {año} != {año_correo}")
                                continue
                            
                            emails_filtrados.append(email)
                            logger.info(f"Correo añadido a filtrados por fecha de transferencia")
                
                logger.info(f"Después de filtrar por mes {mes}, quedan {len(emails_filtrados)} correos")
                emails = emails_filtrados
            
            # Procesar cada correo para actualizar pagos
            pagos_actualizados = 0
            for email in emails:
                # Parsear el correo para extraer información
                transfer_data = self.email_parser.parse_banco_chile_email(email)
                logger.info(f"Datos extraídos del correo: {transfer_data}")
                
                if transfer_data:
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
            if not transfer_data or ('emisor' not in transfer_data and 'rut_destinatario' not in transfer_data):
                logger.warning("Datos de transferencia incompletos, no se puede actualizar pago")
                return False
            
            # Obtener el nombre del emisor (quien hizo la transferencia)
            emisor = transfer_data.get('emisor', '').strip().lower()
            logger.info(f"Emisor original: '{emisor}'")
            
            # Buscar inquilino por nombre con comparación más robusta
            inquilinos = Inquilino.query.all()
            logger.info(f"Total de socios en base de datos: {len(inquilinos)}")
            inquilino_encontrado = None
            
            # Normalizar el emisor (quitar espacios extras)
            emisor_norm = ' '.join(emisor.split()).lower()
            logger.info(f"Emisor normalizado: '{emisor_norm}'")
            
            # Primero intentar coincidencia exacta
            for inquilino in inquilinos:
                nombre_norm = ' '.join(inquilino.propietario.split()).lower()
                logger.info(f"Comparando con: '{nombre_norm}' (ID: {inquilino.id})")
                
                if emisor_norm == nombre_norm:
                    logger.info(f"¡COINCIDENCIA EXACTA! Socio encontrado: {inquilino.propietario}")
                    inquilino_encontrado = inquilino
                    break
            
            # Si no hay coincidencia exacta, intentar coincidencia parcial
            if not inquilino_encontrado:
                for inquilino in inquilinos:
                    nombre_norm = ' '.join(inquilino.propietario.split()).lower()
                    if nombre_norm in emisor_norm or emisor_norm in nombre_norm:
                        logger.info(f"¡Coincidencia parcial! Socio: {inquilino.propietario}")
                        inquilino_encontrado = inquilino
                        break
            
            if not inquilino_encontrado:
                logger.warning(f"No se encontró socio para el emisor: '{emisor}'")
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
