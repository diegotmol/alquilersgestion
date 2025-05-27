"""
Servicio para analizar y extraer información de correos electrónicos del Banco de Chile.
Versión optimizada específicamente para el formato actual de correos del Banco de Chile.
"""
import re
import base64
import logging
from bs4 import BeautifulSoup
from datetime import datetime

# Configurar logging
logger = logging.getLogger(__name__)

class EmailParser:
    def __init__(self):
        pass
    
    def parse_banco_chile_email(self, email):
        """
        Analiza un correo electrónico del Banco de Chile y extrae la información relevante.
        
        Args:
            email (dict): Correo electrónico obtenido de la API de Gmail
            
        Returns:
            dict: Información extraída del correo o None si no es un correo válido
        """
        try:
            logger.info(f"Iniciando parseo de correo con ID: {email.get('id', 'sin ID')}")
            
            # Verificar remitente
            from_header = email.get('from', '')
            logger.info(f"Remitente del correo: {from_header}")
            
            if 'serviciodetransferencias@bancochile.cl' not in from_header:
                logger.info("Remitente no coincide con servicio de transferencias, ignorando correo")
                return None
            
            # Extraer el cuerpo del correo
            payload = email.get('payload', {})
            parts = payload.get('parts', [])
            
            html_content = None
            # Intentar obtener el contenido HTML
            if parts:
                for part in parts:
                    if part.get('mimeType') == 'text/html':
                        data = part.get('body', {}).get('data', '')
                        if data:
                            try:
                                html_content = base64.urlsafe_b64decode(data).decode('utf-8')
                                break
                            except Exception as e:
                                logger.error(f"Error al decodificar HTML: {str(e)}")
            else:
                # Si no hay parts, intentar obtener el body directamente
                body = payload.get('body', {})
                data = body.get('data', '')
                if data:
                    try:
                        html_content = base64.urlsafe_b64decode(data).decode('utf-8')
                    except Exception as e:
                        logger.error(f"Error al decodificar HTML del body: {str(e)}")
                
                # Si no hay datos en payload, intentar con el campo 'body' directo
                if not html_content:
                    body = email.get('body', '')
                    if body:
                        try:
                            html_content = base64.urlsafe_b64decode(body).decode('utf-8')
                        except Exception as e:
                            logger.error(f"Error al decodificar HTML del campo body directo: {str(e)}")
            
            if not html_content:
                logger.warning("No se encontró contenido HTML en el correo")
                return None
            
            # Parsear el HTML
            try:
                soup = BeautifulSoup(html_content, 'html.parser')
                logger.info("HTML parseado correctamente, buscando elementos...")
            except Exception as e:
                logger.error(f"Error al parsear HTML con BeautifulSoup: {str(e)}")
                return None
            
            # Inicializar diccionario para datos de transferencia
            transfer_data = {}
            
            # Extraer el nombre del emisor - VERSIÓN OPTIMIZADA PARA FORMATO ACTUAL
            emisor = None
            
            # Verificar que soup no sea None antes de usar find_all
            if soup is not None:
                # Método 1: Buscar el patrón específico del formato actual
                try:
                    # Buscar texto que contenga "Te informamos que nuestro(a) cliente"
                    for td in soup.find_all('td'):
                        text = td.get_text()
                        if 'Te informamos que nuestro(a) cliente' in text and 'ha efectuado una transferencia' in text:
                            logger.info(f"Encontrado texto con información del cliente")
                            
                            # Buscar el tag <b> dentro del td que contiene el nombre del cliente
                            b_tags = td.find_all('b')
                            for b_tag in b_tags:
                                # El segundo tag <b> suele contener el nombre del emisor
                                if 'Diego T' not in b_tag.text:  # Ignorar el nombre del destinatario
                                    emisor = b_tag.text.strip()
                                    logger.info(f"Emisor extraído del tag <b>: '{emisor}'")
                                    break
                            
                            if not emisor:
                                # Si no se encontró con b_tags, intentar con regex
                                match = re.search(r'cliente\s+<b>(.*?)</b>\s+ha efectuado', str(td))
                                if match:
                                    emisor = match.group(1).strip()
                                    logger.info(f"Emisor extraído con regex: '{emisor}'")
                            break
                except Exception as e:
                    logger.error(f"Error al buscar emisor en formato actual: {str(e)}")
                
                # Método 2: Buscar en todo el texto con patrón alternativo
                if not emisor:
                    try:
                        # Buscar cualquier texto que contenga "cliente" seguido de un nombre en negrita
                        pattern = r'cliente\s+<b>(.*?)</b>'
                        match = re.search(pattern, html_content)
                        if match:
                            emisor = match.group(1).strip()
                            logger.info(f"Emisor encontrado con patrón alternativo: '{emisor}'")
                    except Exception as e:
                        logger.error(f"Error al buscar emisor con patrón alternativo: {str(e)}")
                
                # Método 3: Buscar en tablas específicas
                if not emisor:
                    try:
                        # Buscar tablas que puedan contener información del emisor
                        tables = soup.find_all('table')
                        for table in tables:
                            rows = table.find_all('tr')
                            for row in rows:
                                cells = row.find_all('td')
                                if len(cells) >= 2:
                                    header_cell = cells[0].get_text().strip().lower()
                                    if 'nombre' in header_cell and 'emisor' in header_cell:
                                        emisor = cells[1].get_text().strip()
                                        logger.info(f"Emisor encontrado en tabla: '{emisor}'")
                                        break
                            if emisor:
                                break
                    except Exception as e:
                        logger.error(f"Error al buscar emisor en tablas: {str(e)}")
            else:
                logger.error("BeautifulSoup devolvió None, no se puede buscar el emisor")
            
            if emisor:
                transfer_data['emisor'] = emisor
            else:
                logger.warning("No se pudo extraer el emisor")
            
            # Extraer la fecha
            fecha_obj = None
            
            # Verificar que soup no sea None antes de usar find_all
            if soup is not None:
                # Método 1: Buscar en la tabla de datos de cuenta
                try:
                    for td in soup.find_all('td'):
                        if td.get_text().strip() == 'Fecha':
                            # La fecha está en la celda siguiente
                            fecha_td = td.find_next('td')
                            if fecha_td:
                                fecha_text = fecha_td.get_text().strip()
                                logger.info(f"Fecha encontrada en tabla: {fecha_text}")
                                try:
                                    fecha_obj = datetime.strptime(fecha_text, '%d/%m/%Y')
                                    logger.info(f"Fecha parseada: {fecha_obj}")
                                    break
                                except Exception as e:
                                    logger.error(f"Error al parsear fecha '{fecha_text}': {str(e)}")
                except Exception as e:
                    logger.error(f"Error al buscar fecha en tabla: {str(e)}")
                
                # Método 2: Buscar todas las celdas de tabla
                if not fecha_obj:
                    try:
                        for td in soup.find_all('td'):
                            text = td.get_text().strip()
                            # Buscar un patrón de fecha dd/mm/yyyy
                            match = re.search(r'(\d{2}/\d{2}/\d{4})', text)
                            if match:
                                fecha_text = match.group(1)
                                logger.info(f"Posible fecha encontrada: {fecha_text}")
                                try:
                                    fecha_obj = datetime.strptime(fecha_text, '%d/%m/%Y')
                                    logger.info(f"Fecha parseada: {fecha_obj}")
                                    break
                                except Exception as e:
                                    logger.error(f"Error al parsear fecha '{fecha_text}': {str(e)}")
                    except Exception as e:
                        logger.error(f"Error al buscar fecha en celdas: {str(e)}")
            else:
                logger.error("BeautifulSoup devolvió None, no se puede buscar la fecha")
            
            if fecha_obj:
                transfer_data['fecha'] = fecha_obj
                transfer_data['mes'] = fecha_obj.month
                transfer_data['año'] = fecha_obj.year
                logger.info(f"Fecha final: {fecha_obj}, Mes: {fecha_obj.month}, Año: {fecha_obj.year}")
            else:
                logger.warning("No se pudo extraer la fecha")
            
            # Extraer el monto
            monto = None
            
            # Verificar que soup no sea None antes de usar find_all
            if soup is not None:
                # Método 1: Buscar en la tabla de datos de transferencia
                try:
                    for td in soup.find_all('td'):
                        if td.get_text().strip() == 'Monto':
                            # El monto está en la celda siguiente
                            monto_td = td.find_next('td')
                            if monto_td:
                                monto_text = monto_td.get_text().strip()
                                logger.info(f"Monto encontrado en tabla: {monto_text}")
                                # Limpiar el monto (quitar $, puntos, comas y convertir a número)
                                monto_limpio = re.sub(r'[^\d]', '', monto_text)
                                try:
                                    monto = int(monto_limpio)
                                    logger.info(f"Monto parseado: {monto}")
                                    break
                                except Exception as e:
                                    logger.error(f"Error al parsear monto '{monto_text}': {str(e)}")
                except Exception as e:
                    logger.error(f"Error al buscar monto en tabla: {str(e)}")
                
                # Método 2: Buscar el monto en celdas de tabla
                if not monto:
                    try:
                        for td in soup.find_all('td'):
                            text = td.get_text().strip()
                            # Buscar un patrón de monto $XX.XXX o $XX,XXX
                            match = re.search(r'\$\s*([\d\.,]+)', text)
                            if match:
                                monto_text = match.group(1)
                                logger.info(f"Posible monto encontrado: {monto_text}")
                                # Limpiar el monto (quitar puntos, comas y convertir a número)
                                monto_limpio = re.sub(r'[^\d]', '', monto_text)
                                try:
                                    monto = int(monto_limpio)
                                    logger.info(f"Monto parseado: {monto}")
                                    break
                                except Exception as e:
                                    logger.error(f"Error al parsear monto '{monto_text}': {str(e)}")
                    except Exception as e:
                        logger.error(f"Error al buscar monto en celdas: {str(e)}")
            else:
                logger.error("BeautifulSoup devolvió None, no se puede buscar el monto")
            
            if monto:
                transfer_data['monto'] = monto
                logger.info(f"Monto final: {monto}")
            else:
                logger.warning("No se pudo extraer el monto")
            
            # Extraer otros datos si están disponibles
            if soup is not None:
                try:
                    # Extraer el RUT del destinatario
                    rut_element = soup.find('td', string=re.compile('Rut'))
                    if rut_element and rut_element.find_next('td'):
                        transfer_data['rut_destinatario'] = rut_element.find_next('td').text.strip()
                        logger.info(f"RUT destinatario: {transfer_data['rut_destinatario']}")
                    
                    # Extraer el email del destinatario
                    email_element = soup.find('td', string=re.compile('Email'))
                    if email_element and email_element.find_next('td'):
                        transfer_data['email_destinatario'] = email_element.find_next('td').text.strip()
                        logger.info(f"Email destinatario: {transfer_data['email_destinatario']}")
                    
                    # Extraer el número de comprobante
                    comprobante_element = soup.find('td', string=re.compile('Número de comprobante'))
                    if comprobante_element and comprobante_element.find_next('td'):
                        transfer_data['comprobante'] = comprobante_element.find_next('td').text.strip()
                        logger.info(f"Número de comprobante: {transfer_data['comprobante']}")
                except Exception as e:
                    logger.error(f"Error al extraer datos adicionales: {str(e)}")
            
            # Método de respaldo: usar el RUT como identificador
            if not 'emisor' in transfer_data and 'rut_destinatario' in transfer_data:
                try:
                    # Si no podemos encontrar el emisor pero tenemos el RUT, usarlo como identificador
                    emisor = f"Cliente RUT {transfer_data['rut_destinatario']}"
                    logger.info(f"Usando RUT como identificador de emisor: '{emisor}'")
                    transfer_data['emisor'] = emisor
                except Exception as e:
                    logger.error(f"Error al usar RUT como identificador: {str(e)}")
            
            # Verificar si se extrajeron los datos mínimos necesarios
            if ('emisor' in transfer_data or 'rut_destinatario' in transfer_data) and 'fecha' in transfer_data:
                logger.info(f"Datos extraídos correctamente: {transfer_data}")
                return transfer_data
            else:
                logger.warning(f"No se pudieron extraer todos los datos necesarios. Datos parciales: {transfer_data}")
                return None
                
        except Exception as e:
            logger.error(f"Error al parsear correo: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return None
