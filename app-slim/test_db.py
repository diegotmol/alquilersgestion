from src.models.database import db
from src.main import app

with app.app_context():
    print('Conectando a la base de datos...')
    try:
        result = db.session.execute('SELECT 1')
        print('Conexión exitosa a la base de datos')
    except Exception as e:
        print(f'Error al conectar a la base de datos: {e}')
