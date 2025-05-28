"""
Servicio para la sincronización de correos electrónicos y actualización de pagos mensuales.
Versión depurada con manejo de sesiones mejorado y prevención de bloqueos.
"""
import logging
import re
import unicodedata
from datetime import datetime
import pytz
from src.services.gmail_service_real import GmailServiceReal
from src.services.email_parser import EmailParser
from src.models.configuracion import Configuracion
from src.models.inquilino import Inquilino
from src.models.database import db
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

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
            # Log de inicio de sincronización
            logger.info("==================== INICIO DE SINCRONIZACIÓN ====================")
            logger.info(f"Parámetros: mes={mes}, año={año}")
            
            # Modificar la consulta para buscar por remitente en lugar de asunto
            query = "from:serviciodetransferencias@bancochile.cl"
            
            logger.info(f"Ejecutando búsqueda con query: {query}")
            
            # Obtener correos
            emails = self.gmail_service.get_emails(credentials, query=query)
            
            logger.info(f"Se encontraron {len(emails)} correos del servicio de transferencias.")
            
            # Si se especificó un mes, filtrar los correos por la fecha de RECEPCIÓN
            emails_filtrados = []
            if mes and mes != 'todos':
                logger.info(f"Filtrando correos por mes seleccionado: {mes}")
                for email in emails:
                    # Extraer la fecha de recepción del correo
                    fecha_recepcion = None
                    if 'internalDate' in email:
                        try:
                            # internalDate es un timestamp en milisegundos
                            timestamp_ms = int(email['internalDate'])
                            fecha_recepcion = datetime.fromtimestamp(timestamp_ms/1000.0)
                            mes_recepcion = f"{fecha_recepcion.month:02d}"
                            
                            logger.info(f"Correo recibido en fecha: {fecha_recepcion}, mes: {mes_recepcion}")
                            
                            # Filtrar por mes de recepción
                            if mes_recepcion == mes:
                                logger.info(f"Correo coincide con el mes seleccionado: {mes}")
                                emails_filtrados.append(email)
                                continue
                        except Exception as e:
                            logger.error(f"Error al procesar fecha de recepción: {str(e)}")
                    
                    # Si no se pudo extraer la fecha de recepción, intentar con la fecha de la transferencia
                    transfer_data = self.email_parser.parse_banco_chile_email(email)
                    if transfer_data and 'mes' in transfer_data:
                        mes_correo = f"{transfer_data['mes']:02d}"
                        logger.info(f"Usando fecha de transferencia, mes: {mes_correo}")
                        if mes_correo == mes:
                            logger.info(f"Correo coincide con el mes seleccionado por fecha de transferencia: {mes}")
                            emails_filtrados.append(email)
                
                logger.info(f"Después de filtrar por mes {mes}, quedan {len(emails_filtrados)} correos")
                emails = emails_filtrados
            
            # Procesar cada correo para actualizar pagos
            pagos_actualizados = 0
            for i, email in enumerate(emails):
                logger.info(f"==================== PROCESANDO CORREO {i+1}/{len(emails)} ====================")
                
                # Parsear el correo para extraer información
                transfer_data = self.email_parser.parse_banco_chile_email(email)
                
                if transfer_data:
                    logger.info(f"Datos extraídos del correo: {transfer_data}")
                    
                    # Actualizar el estado de pago del inquilino correspondiente
                    actualizado = self._actualizar_pago_inquilino(transfer_data, mes, año)
                    if actualizado:
                        pagos_actualizados += 1
                        logger.info(f"Pago actualizado correctamente para este correo")
                    else:
                        logger.warning(f"No se pudo actualizar el pago para este correo")
                else:
                    logger.warning(f"No se pudieron extraer datos de este correo")
            
            # Actualizar fecha de última sincronización - USAR UTC EXPLÍCITAMENTE
            now = datetime.now(pytz.UTC)
            logger.info(f"Actualizando fecha de última sincronización a: {now}")
            
            # Usar una nueva sesión para evitar bloqueos
            try:
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
            except SQLAlchemyError as e:
                logger.error(f"Error al guardar fecha de sincronización: {str(e)}")
                db.session.rollback()
            
            logger.info("==================== FIN DE SINCRONIZACIÓN ====================")
            
            return {
                "success": True,
                "mensaje": f"Se encontraron {len(emails)} transferencias. Se actualizaron {pagos_actualizados} pagos.",
                "emails": len(emails),
                "pagos_actualizados": pagos_actualizados,
                "fecha_sincronizacion": now.isoformat()  # Incluir la fecha en la respuesta
            }
        except Exception as e:
            logger.error(f"Error en sincronización: {str(e)}")
            # Asegurar que cualquier transacción pendiente se revierta
            try:
                db.session.rollback()
            except:
                pass
            
            return {
                "success": False,
                "mensaje": f"Error en sincronización: {str(e)}",
                "emails": 0,
                "pagos_actualizados": 0
            }
    
    def normalizar_texto(self, texto):
        """
        Normalización de texto para comparación flexible.
        
        Args:
            texto (str): Texto a normalizar
            
        Returns:
            str: Texto normalizado
        """
        if not texto:
            return ""
        
        # Paso 1: Convertir a minúsculas
        texto = texto.lower()
        
        # Paso 2: Eliminar acentos y convertir a ASCII
        texto = unicodedata.normalize('NFKD', texto).encode('ASCII', 'ignore').decode('ASCII')
        
        # Paso 3: Eliminar todos los caracteres que no sean letras o números
        texto = re.sub(r'[^a-z0-9]', '', texto)
        
        return texto
    
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
        # Crear una nueva sesión para esta operación
        session_created = False
        
        try:
            logger.info("==================== INICIANDO MATCHING DE INQUILINO ====================")
            
            # Verificar que tenemos los datos necesarios
            if not transfer_data:
                logger.warning("Datos de transferencia incompletos, no se puede actualizar pago")
                return False
            
            # Obtener el nombre del emisor (quien hizo la transferencia)
            emisor = transfer_data.get('emisor', '').strip()
            logger.info(f"Emisor original: '{emisor}'")
            
            if not emisor:
                logger.warning("Emisor no encontrado en los datos de transferencia")
                return False
            
            # Buscar inquilino por nombre con comparación más robusta
            logger.info("Cargando todos los inquilinos de la base de datos para matching")
            try:
                inquilinos = Inquilino.query.all()
                logger.info(f"Total de socios en base de datos: {len(inquilinos)}")
            except SQLAlchemyError as e:
                logger.error(f"Error al cargar inquilinos: {str(e)}")
                return False
            
            # Log de todos los inquilinos disponibles para matching
            inquilinos_nombres = [i.propietario for i in inquilinos]
            logger.info(f"Inquilinos disponibles para matching: {inquilinos_nombres}")
            
            inquilino_encontrado = None
            
            # Normalizar el emisor
            emisor_norm = self.normalizar_texto(emisor)
            logger.info(f"Emisor normalizado: '{emisor_norm}'")
            
            # Obtener el monto de la transferencia
            monto_transferencia = transfer_data.get('monto', 0)
            logger.info(f"Monto de la transferencia: {monto_transferencia}")
            
            logger.info("Iniciando proceso de comparación para matching")
            # Intentar coincidencia por nombre normalizado (flexible)
            for inquilino in inquilinos:
                nombre_inquilino = inquilino.propietario
                logger.info(f"Comparando con socio: '{nombre_inquilino}' (ID: {inquilino.id})")
                
                nombre_norm = self.normalizar_texto(nombre_inquilino)
                logger.info(f"Nombre socio normalizado: '{nombre_norm}'")
                
                # Comparación flexible: verificar si una cadena está contenida en la otra
                if nombre_norm in emisor_norm or emisor_norm in nombre_norm:
                    logger.info(f"¡COINCIDENCIA DE NOMBRE! Socio encontrado: {inquilino.propietario}")
                    
                    # Verificar si el monto coincide (obligatorio)
                    if float(inquilino.monto) == float(monto_transferencia):
                        logger.info(f"¡COINCIDENCIA DE MONTO! Monto del socio: {inquilino.monto}, Monto de transferencia: {monto_transferencia}")
                        inquilino_encontrado = inquilino
                        break
                    else:
                        logger.warning(f"El monto de la transferencia ({monto_transferencia}) no coincide con el monto del socio ({inquilino.monto})")
            
            if not inquilino_encontrado:
                logger.warning(f"NO SE ENCONTRÓ MATCH para el emisor: '{emisor}' con monto: {monto_transferencia}")
                logger.info("==================== FIN DE MATCHING (SIN ÉXITO) ====================")
                return False
            
            logger.info(f"MATCH EXITOSO: Emisor '{emisor}' coincide con inquilino '{inquilino_encontrado.propietario}' (ID: {inquilino_encontrado.id})")
            
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
            logger.info(f"Columna a actualizar: '{columna}'")
            
            # Verificar si la columna existe
            try:
                # Usar SQLAlchemy para actualizar la columna dinámicamente
                # Primero verificar si la columna existe
                inspector = db.inspect(db.engine)
                columnas_existentes = [col['name'] for col in inspector.get_columns('inquilinos')]
                
                logger.info(f"Columnas existentes en la tabla: {columnas_existentes}")
                
                if columna not in columnas_existentes:
                    logger.warning(f"La columna '{columna}' no existe en la tabla inquilinos")
                    # Intentar crear la columna si no existe
                    try:
                        logger.info(f"Intentando crear la columna '{columna}'")
                        query = text(f"ALTER TABLE inquilinos ADD COLUMN {columna} VARCHAR(20) NOT NULL DEFAULT 'No pagado'")
                        db.session.execute(query)
                        db.session.commit()
                        logger.info(f"Columna '{columna}' creada correctamente")
                    except SQLAlchemyError as e:
                        logger.error(f"Error al crear la columna '{columna}': {str(e)}")
                        db.session.rollback()
                        return False
                
                # Actualizar el estado de pago en la columna correspondiente
                logger.info(f"Actualizando columna '{columna}' a 'Pagado' para inquilino ID: {inquilino_encontrado.id}")
                query = text(f"UPDATE inquilinos SET {columna} = 'Pagado' WHERE id = :id")
                db.session.execute(query, {"id": inquilino_encontrado.id})
                db.session.commit()
                
                logger.info(f"ACTUALIZACIÓN EXITOSA: Estado de pago actualizado para {inquilino_encontrado.propietario} en columna {columna}")
                logger.info("==================== FIN DE MATCHING (EXITOSO) ====================")
                return True
                
            except SQLAlchemyError as e:
                logger.error(f"Error al actualizar estado de pago: {str(e)}")
                db.session.rollback()
                logger.info("==================== FIN DE MATCHING (ERROR) ====================")
                return False
                
        except Exception as e:
            logger.error(f"Error en _actualizar_pago_inquilino: {str(e)}")
            # Asegurar que cualquier transacción pendiente se revierta
            try:
                db.session.rollback()
            except:
                pass
            
            logger.info("==================== FIN DE MATCHING (ERROR) ====================")
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
            # Asegurar que cualquier transacción pendiente se revierta
            try:
                db.session.rollback()
            except:
                pass
            
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
