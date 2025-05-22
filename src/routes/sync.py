@sync_bp.route('/api/auth/url', methods=['GET'])
def get_auth_url():
    """
    Obtiene la URL de autorización para OAuth2 con Gmail.
    """
    logger.info("Endpoint /api/auth/url llamado")
    try:
        # Verificar que el archivo client_secret.json existe
        client_secrets_file = os.path.join(os.getcwd(), "client_secret.json")
        logger.info(f"Verificando existencia de client_secret.json en: {client_secrets_file}")
        
        if not os.path.exists(client_secrets_file):
            error_msg = f"El archivo client_secret.json no existe en: {client_secrets_file}"
            logger.error(error_msg)
            return jsonify({
                'error': 'El archivo client_secret.json no existe',
                'mensaje': 'Archivo de credenciales no encontrado',
                'ruta_buscada': client_secrets_file,
                'directorio_actual': os.getcwd(),
                'archivos_disponibles': os.listdir(os.getcwd())
            }), 500
        
        logger.info("Archivo client_secret.json encontrado, llamando a sync_service.get_auth_url()")
        
        # Intentar generar la URL de autorización
        auth_url = None
        try:
            auth_url = sync_service.get_auth_url()
            logger.info(f"Valor devuelto por sync_service.get_auth_url(): {type(auth_url)}")
        except Exception as e:
            error_msg = f"Error en sync_service.get_auth_url(): {str(e)}"
            logger.error(error_msg)
            return jsonify({
                'error': str(e),
                'mensaje': 'Error al generar la URL de autorización',
                'tipo_error': type(e).__name__
            }), 500
        
        # Verificar explícitamente que la URL no sea None o vacía
        if not auth_url:
            error_msg = "URL de autorización vacía o None"
            logger.error(error_msg)
            return jsonify({
                'error': error_msg,
                'mensaje': 'No se pudo generar la URL de autorización',
                'valor_recibido': str(auth_url)
            }), 500
        
        logger.info(f"URL de autorización generada correctamente: {auth_url[:50]}...")
        response_data = {'auth_url': auth_url}
        logger.info(f"Devolviendo respuesta JSON: {response_data}")
        return jsonify(response_data)
        
    except Exception as e:
        # Asegurar que siempre devolvemos JSON, incluso en caso de error
        error_msg = f"Error no manejado en get_auth_url: {str(e)}"
        logger.error(error_msg)
        return jsonify({
            'error': str(e),
            'mensaje': 'Error al obtener URL de autenticación',
            'tipo_error': type(e).__name__,
            'traza': str(e.__traceback__)
        }), 500
