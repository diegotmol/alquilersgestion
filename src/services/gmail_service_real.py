def __init__(self):
    # Comentar o eliminar estas líneas
    # self.client_id = os.getenv('GOOGLE_CLIENT_ID')
    # self.client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
    # self.redirect_uri = os.getenv('GOOGLE_REDIRECT_URI')
    
    # Ruta al archivo client_secret.json
    self.client_secrets_file = "client_secret.json"
    self.redirect_uri = "https://gestion-pagos-alquileres.onrender.com/callback"
    self.scopes = ['https://www.googleapis.com/auth/gmail.readonly']
    
def get_auth_url(self ):
    """
    Genera la URL de autorización para OAuth2 con Gmail.
    """
    # Cambiar esto
    flow = Flow.from_client_secrets_file(
        self.client_secrets_file,
        scopes=self.scopes,
        redirect_uri=self.redirect_uri
    )
    
    auth_url, _ = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent'
    )
    
    return auth_url

def get_token(self, code):
    """
    Obtiene el token de acceso a partir del código de autorización.
    """
    # Cambiar esto también
    flow = Flow.from_client_secrets_file(
        self.client_secrets_file,
        scopes=self.scopes,
        redirect_uri=self.redirect_uri
    )
    
    # Intercambiar el código por un token
    flow.fetch_token(code=code)
    
    # El resto del código permanece igual
    # ...
