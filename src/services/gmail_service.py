"""
Servicio simulado para la autenticación y acceso a Gmail.
Este módulo proporciona funcionalidades para simular la conexión con Gmail
y la extracción de correos electrónicos para la sincronización de pagos.
"""

import json
import os
import datetime
from typing import List, Dict, Any

class GmailService:
    """Clase para simular la autenticación y acceso a Gmail."""
    
    def __init__(self):
        """Inicializa el servicio de Gmail simulado."""
        self.authenticated = False
        self.emails_directory = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
        os.makedirs(self.emails_directory, exist_ok=True)
        self.sample_emails_file = os.path.join(self.emails_directory, 'sample_emails.json')
        
        # Crear datos de ejemplo si no existen
        if not os.path.exists(self.sample_emails_file):
            self._create_sample_emails()
    
    def authenticate(self) -> bool:
        """
        Simula el proceso de autenticación con Gmail.
        
        Returns:
            bool: True si la autenticación fue exitosa, False en caso contrario.
        """
        # En una implementación real, aquí se realizaría la autenticación OAuth2
        self.authenticated = True
        return self.authenticated
    
    def get_emails(self, query: str = "from:serviciodetransferencias@bancochile.cl", max_results: int = 10) -> List[Dict[str, Any]]:
        """
        Simula la obtención de correos electrónicos desde Gmail.
        
        Args:
            query (str): Consulta para filtrar correos (simulado).
            max_results (int): Número máximo de resultados a devolver.
            
        Returns:
            List[Dict[str, Any]]: Lista de correos electrónicos simulados.
        """
        if not self.authenticated:
            raise Exception("No autenticado. Debe llamar a authenticate() primero.")
        
        # Cargar correos de ejemplo
        with open(self.sample_emails_file, 'r', encoding='utf-8') as f:
            emails = json.load(f)
        
        # Filtrar por la consulta (simulado)
        if "from:serviciodetransferencias@bancochile.cl" in query:
            filtered_emails = [email for email in emails if email.get('from') == 'serviciodetransferencias@bancochile.cl']
        else:
            filtered_emails = emails
        
        return filtered_emails[:max_results]
    
    def _create_sample_emails(self):
        """Crea correos electrónicos de ejemplo para la simulación."""
        sample_emails = [
            {
                "id": "email1",
                "from": "serviciodetransferencias@bancochile.cl",
                "to": "dtapia.mol@gmail.com",
                "subject": "Aviso de transferencia de fondos",
                "date": "2025-04-21T08:44:00Z",
                "body_html": """
                <div>
                    <h2>Comprobante de transferencia electrónica de fondos</h2>
                    <p>Estimado(a): Diego T</p>
                    <p>Te informamos que nuestro(a) cliente Diego Alfredo Tapia ha efectuado una transferencia de fondos a tu cuenta con el siguiente detalle:</p>
                    
                    <div>
                        <h3>Datos de cuenta</h3>
                        <p>Fecha: 21/04/2025</p>
                    </div>
                    
                    <div>
                        <h3>Datos de destinatario</h3>
                        <p>Nombre y Apellido: Diego T</p>
                        <p>Rut: 18410125-4</p>
                        <p>Email: dtapia.mol@gmail.com</p>
                        <p>Banco: Tenpo Prepago</p>
                        <p>Cuenta destino: Cuenta Vista</p>
                        <p>11-111-84101-25</p>
                    </div>
                    
                    <div>
                        <h3>Monto</h3>
                        <p>$36.000</p>
                    </div>
                    
                    <div>
                        <p>Número de comprobante: TEFMBCO250421084411910820366</p>
                    </div>
                </div>
                """
            },
            {
                "id": "email2",
                "from": "serviciodetransferencias@bancochile.cl",
                "to": "dtapia.mol@gmail.com",
                "subject": "Aviso de transferencia de fondos",
                "date": "2025-05-15T10:22:00Z",
                "body_html": """
                <div>
                    <h2>Comprobante de transferencia electrónica de fondos</h2>
                    <p>Estimado(a): Diego T</p>
                    <p>Te informamos que nuestro(a) cliente Carlos Rodríguez ha efectuado una transferencia de fondos a tu cuenta con el siguiente detalle:</p>
                    
                    <div>
                        <h3>Datos de cuenta</h3>
                        <p>Fecha: 15/05/2025</p>
                    </div>
                    
                    <div>
                        <h3>Datos de destinatario</h3>
                        <p>Nombre y Apellido: Diego T</p>
                        <p>Rut: 18410125-4</p>
                        <p>Email: dtapia.mol@gmail.com</p>
                        <p>Banco: Tenpo Prepago</p>
                        <p>Cuenta destino: Cuenta Vista</p>
                        <p>11-111-84101-25</p>
                    </div>
                    
                    <div>
                        <h3>Monto</h3>
                        <p>$300.000</p>
                    </div>
                    
                    <div>
                        <p>Número de comprobante: TEFMBCO250515102211910820367</p>
                    </div>
                </div>
                """
            },
            {
                "id": "email3",
                "from": "serviciodetransferencias@bancochile.cl",
                "to": "otro@ejemplo.com",
                "subject": "Aviso de transferencia de fondos",
                "date": "2025-05-18T14:30:00Z",
                "body_html": """
                <div>
                    <h2>Comprobante de transferencia electrónica de fondos</h2>
                    <p>Estimado(a): Juan Pérez</p>
                    <p>Te informamos que nuestro(a) cliente María González ha efectuado una transferencia de fondos a tu cuenta con el siguiente detalle:</p>
                    
                    <div>
                        <h3>Datos de cuenta</h3>
                        <p>Fecha: 18/05/2025</p>
                    </div>
                    
                    <div>
                        <h3>Datos de destinatario</h3>
                        <p>Nombre y Apellido: Juan Pérez</p>
                        <p>Rut: 12345678-9</p>
                        <p>Email: otro@ejemplo.com</p>
                        <p>Banco: Banco Estado</p>
                        <p>Cuenta destino: Cuenta Corriente</p>
                        <p>22-222-12345-67</p>
                    </div>
                    
                    <div>
                        <h3>Monto</h3>
                        <p>$150.000</p>
                    </div>
                    
                    <div>
                        <p>Número de comprobante: TEFMBCO250518143011910820368</p>
                    </div>
                </div>
                """
            }
        ]
        
        # Guardar correos de ejemplo
        with open(self.sample_emails_file, 'w', encoding='utf-8') as f:
            json.dump(sample_emails, f, ensure_ascii=False, indent=2)

# Función para obtener una instancia del servicio
def get_gmail_service() -> GmailService:
    """
    Obtiene una instancia del servicio de Gmail simulado.
    
    Returns:
        GmailService: Instancia del servicio de Gmail.
    """
    return GmailService()
