"""
Script para actualizar la estructura de la base de datos manualmente.
Este script añade columnas de pagos mensuales por año a la tabla inquilinos.
Ejecutar directamente en el servidor para actualizar la estructura.
"""
import os
import sys
import psycopg2
from psycopg2 import sql

def obtener_conexion():
    """
    Obtiene una conexión a la base de datos usando la variable de entorno DATABASE_URL.
    """
    # Usar la cadena de conexión específica si DATABASE_URL no está configurada
    database_url = os.getenv('DATABASE_URL', 'postgresql://gestion_pagos_user:ZMF1bPMxnsp52UvNPF37sMMY1pLoIwqT@dpg-d0n2s9re5dus73auvbhg-a/gestion_pagos')
    
    # Si es una URL de postgres, convertirla al formato que psycopg2 necesita
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    
    print(f"Conectando a la base de datos: {database_url[:20]}...")
    
    try:
        conn = psycopg2.connect(database_url)
        return conn
    except Exception as e:
        print(f"Error al conectar a la base de datos: {str(e)}")
        sys.exit(1)

def verificar_columna_existe(cursor, tabla, columna):
    """
    Verifica si una columna existe en la tabla especificada.
    """
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = %s AND column_name = %s
    """, (tabla, columna))
    
    return cursor.fetchone() is not None

def agregar_columnas_pagos():
    """
    Agrega las columnas de pagos mensuales para 2025 y 2026 a la tabla inquilinos.
    """
    conn = obtener_conexion()
    cursor = conn.cursor()
    
    try:
        # Verificar si la tabla inquilinos existe
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'inquilinos'
            )
        """)
        
        if not cursor.fetchone()[0]:
            print("La tabla 'inquilinos' no existe. Verifica el nombre de la tabla.")
            return False
        
        # Añadir columnas para 2025
        for mes in range(1, 13):
            mes_str = f"{mes:02d}"
            columna = f"pago_{mes_str}_2025"
            
            if not verificar_columna_existe(cursor, 'inquilinos', columna):
                print(f"Añadiendo columna {columna}...")
                cursor.execute(
                    sql.SQL("ALTER TABLE inquilinos ADD COLUMN {} VARCHAR(20) NOT NULL DEFAULT 'No pagado'").format(
                        sql.Identifier(columna)
                    )
                )
            else:
                print(f"La columna {columna} ya existe.")
        
        # Añadir columnas para 2026
        for mes in range(1, 13):
            mes_str = f"{mes:02d}"
            columna = f"pago_{mes_str}_2026"
            
            if not verificar_columna_existe(cursor, 'inquilinos', columna):
                print(f"Añadiendo columna {columna}...")
                cursor.execute(
                    sql.SQL("ALTER TABLE inquilinos ADD COLUMN {} VARCHAR(20) NOT NULL DEFAULT 'No pagado'").format(
                        sql.Identifier(columna)
                    )
                )
            else:
                print(f"La columna {columna} ya existe.")
        
        # Guardar cambios
        conn.commit()
        print("Estructura de la base de datos actualizada correctamente.")
        return True
    
    except Exception as e:
        conn.rollback()
        print(f"Error al actualizar la estructura de la base de datos: {str(e)}")
        return False
    
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print("Iniciando actualización de la estructura de la base de datos...")
    resultado = agregar_columnas_pagos()
    
    if resultado:
        print("¡Actualización completada con éxito!")
        print("Ahora puedes reiniciar la aplicación para que los cambios surtan efecto.")
    else:
        print("La actualización falló. Revisa los mensajes de error anteriores.")
