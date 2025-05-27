import base64
import re
import logging
from datetime import datetime
from bs4 import BeautifulSoup
def parse_banco_chile_email(self, email):
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
        
        # Extraer el nombre del emisor
        # Buscar el texto que contiene "Te informamos que nuestro(a) cliente"
        emisor = None
        
        # Verificar que soup no sea None antes de usar find_all
        if soup is not None:
            # Método 1: Buscar en párrafos
            try:
                for p_tag in soup.find_all('p'):
                    text = p_tag.get_text()
                    if 'Te informamos que nuestro(a) cliente' in text:
                        logger.info(f"Encontrado texto con información del cliente: {text}")
                        match = re.search(r'cliente\s+(.*?)\s+ha efectuado', text)
                        if match:
                            emisor = match.group(1).strip()
                            logger.info(f"Emisor extraído: '{emisor}'")
                            break
            except Exception as e:
                logger.error(f"Error al buscar emisor en párrafos: {str(e)}")
            
            # Método 2: Si no se encontró con el método anterior, buscar en todo el texto
            if not emisor:
                try:
                    for text in soup.stripped_strings:
                        if 'cliente' in text and 'ha efectuado' in text:
                            logger.info(f"Encontrado texto alternativo con información del cliente: {text}")
                            match = re.search(r'cliente\s+(.*?)\s+ha efectuado', text)
                            if match:
                                emisor = match.group(1).strip()
                                logger.info(f"Emisor extraído (método alternativo): '{emisor}'")
                                break
                except Exception as e:
                    logger.error(f"Error al buscar emisor en texto completo: {str(e)}")
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
            # Método 1: Buscar todas las celdas de tabla
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
            
            # Método 2: Si no se encontró con el método anterior, buscar en todo el texto
            if not fecha_obj:
                try:
                    for text in soup.stripped_strings:
                        match = re.search(r'(\d{2}/\d{2}/\d{4})', text)
                        if match:
                            fecha_text = match.group(1)
                            logger.info(f"Posible fecha encontrada (método alternativo): {fecha_text}")
                            try:
                                fecha_obj = datetime.strptime(fecha_text, '%d/%m/%Y')
                                logger.info(f"Fecha parseada (método alternativo): {fecha_obj}")
                                break
                            except Exception as e:
                                logger.error(f"Error al parsear fecha '{fecha_text}': {str(e)}")
                except Exception as e:
                    logger.error(f"Error al buscar fecha en texto completo: {str(e)}")
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
            # Método 1: Buscar el monto en celdas de tabla
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
            
            # Método 2: Si no se encontró con el método anterior, buscar en todo el texto
            if not monto:
                try:
                    for text in soup.stripped_strings:
                        match = re.search(r'\$\s*([\d\.,]+)', text)
                        if match:
                            monto_text = match.group(1)
                            logger.info(f"Posible monto encontrado (método alternativo): {monto_text}")
                            monto_limpio = re.sub(r'[^\d]', '', monto_text)
                            try:
                                monto = int(monto_limpio)
                                logger.info(f"Monto parseado (método alternativo): {monto}")
                                break
                            except Exception as e:
                                logger.error(f"Error al parsear monto '{monto_text}': {str(e)}")
                except Exception as e:
                    logger.error(f"Error al buscar monto en texto completo: {str(e)}")
        else:
            logger.error("BeautifulSoup devolvió None, no se puede buscar el monto")
        
        if monto:
            transfer_data['monto'] = monto
            logger.info(f"Monto final: {monto}")
        else:
            logger.warning("No se pudo extraer el monto")
        
        # Verificar si se extrajeron los datos mínimos necesarios
        if 'emisor' in transfer_data and 'fecha' in transfer_data:
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
