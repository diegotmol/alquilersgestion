def _actualizar_pago_inquilino(self, transfer_data, mes_seleccionado=None, anio_seleccionado=None):
    """
    Actualiza el estado de pago de un inquilino basado en los datos de transferencia.
    
    Args:
        transfer_data (dict): Datos extraídos del correo de transferencia
        mes_seleccionado (str, optional): Mes seleccionado por el usuario (formato: 01-12)
        anio_seleccionado (str, optional): Año seleccionado por el usuario (formato: YYYY)
        
    Returns:
        bool: True si se actualizó algún pago, False en caso contrario
    """
    try:
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
        inquilinos = Inquilino.query.all()
        logger.info(f"Total de socios en base de datos: {len(inquilinos)}")
        inquilino_encontrado = None
        
        # Normalizar el emisor
        emisor_norm = self.normalizar_texto(emisor)
        logger.info(f"Emisor normalizado: '{emisor_norm}'")
        
        # Obtener el monto de la transferencia
        monto_transferencia = transfer_data.get('monto', 0)
        logger.info(f"Monto de la transferencia: {monto_transferencia}")
        
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
            logger.warning(f"No se encontró socio para el emisor: '{emisor}' con monto: {monto_transferencia}")
            return False
        
        # Determinar el mes y anio para la columna a actualizar
        if 'fecha' in transfer_data and isinstance(transfer_data['fecha'], datetime):
            # Usar el mes y anio de la transferencia
            mes = transfer_data['fecha'].month
            anio = transfer_data['fecha'].year
            logger.info(f"Usando fecha de transferencia: {mes}/{anio}")
        else:
            # Si no hay fecha en la transferencia, usar el mes y anio seleccionados
            # o el mes y anio actuales como respaldo
            mes = int(mes_seleccionado) if mes_seleccionado and mes_seleccionado != 'todos' else datetime.now().month
            anio = int(anio_seleccionado) if anio_seleccionado else datetime.now().year
            logger.info(f"Usando fecha seleccionada/actual: {mes}/{anio}")
        
        # Formatear el mes con dos dígitos
        mes_str = f"{mes:02d}"
        
        # Nombre de la columna a actualizar
        columna = f"pago_{mes_str}_{anio}"
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
