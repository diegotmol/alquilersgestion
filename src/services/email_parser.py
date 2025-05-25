"""
Servicio para analizar y extraer información de correos electrónicos del Banco de Chile.
"""
import re
import base64
from bs4 import BeautifulSoup
import html
from datetime import datetime

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
        # Verificar que el correo sea del Banco de Chile
        if 'serviciodetransferencias@bancochile.cl' not in email.get('from', ''):
            return None
        
        # Decodificar el cuerpo del correo
        body = email.get('body', '')
        if not body:
            return None
            
        # Decodificar el cuerpo del correo desde base64
        try:
            body_decoded = base64.urlsafe_b64decode(body).decode('utf-8')
        except Exception as e:
            print(f"Error decodificando el cuerpo del correo: {e}")
            return None
        
        # Parsear el HTML
        soup = BeautifulSoup(body_decoded, 'html.parser')
        
        # Extraer información relevante
        transfer_data = {}
        
        # Extraer el nombre del destinatario
        destinatario_element = soup.find(string=re.compile('Estimado\(a\):'))
        if destinatario_element:
            destinatario_text = destinatario_element.strip()
            transfer_data['destinatario'] = destinatario_text.replace('Estimado(a):', '').strip()
        
        # Extraer el nombre del emisor
        emisor_element = soup.find(string=re.compile('Te informamos que nuestro\(a\) cliente'))
        if emisor_element:
            match = re.search(r'cliente\s+(.*?)\s+ha efectuado', emisor_element)
            if match:
                transfer_data['emisor'] = match.group(1).strip()
        
        # Extraer la fecha
        fecha_element = soup.find('td', string=re.compile('Fecha'))
        if fecha_element and fecha_element.find_next('td'):
            fecha_text = fecha_element.find_next('td').text.strip()
            try:
                # Convertir la fecha al formato deseado
                fecha_obj = datetime.strptime(fecha_text, '%d/%m/%Y')
                transfer_data['fecha'] = fecha_obj
                transfer_data['mes'] = fecha_obj.month
                transfer_data['año'] = fecha_obj.year
            except Exception as e:
                print(f"Error parseando la fecha: {e}")
                transfer_data['fecha_texto'] = fecha_text
        
        # Extraer el monto
        monto_element = soup.find(string=re.compile('Monto'))
        if monto_element and monto_element.find_next('td'):
            monto_text = monto_element.find_next('td').text.strip()
            # Limpiar el monto (quitar símbolos y convertir a número)
            monto_limpio = re.sub(r'[^\d]', '', monto_text)
            try:
                transfer_data['monto'] = int(monto_limpio)
            except:
                transfer_data['monto_texto'] = monto_text
        
        # Extraer el RUT del destinatario
        rut_element = soup.find('td', string=re.compile('Rut'))
        if rut_element and rut_element.find_next('td'):
            transfer_data['rut_destinatario'] = rut_element.find_next('td').text.strip()
        
        # Extraer el email del destinatario
        email_element = soup.find('td', string=re.compile('Email'))
        if email_element and email_element.find_next('td'):
            transfer_data['email_destinatario'] = email_element.find_next('td').text.strip()
        
        # Extraer el número de comprobante
        comprobante_element = soup.find('td', string=re.compile('Número de comprobante'))
        if comprobante_element and comprobante_element.find_next('td'):
            transfer_data['comprobante'] = comprobante_element.find_next('td').text.strip()
        
        return transfer_data
