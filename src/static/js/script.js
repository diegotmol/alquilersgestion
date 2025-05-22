// Función para sincronizar correos
function sincronizarCorreos() {
    // Mostrar modal de autenticación de Google
    const modal = document.getElementById('modal-google-auth');
    modal.style.display = 'block';
    
    // Iniciar el proceso de autenticación con Google
    fetch('/api/auth/url')
        .then(response => response.json())
        .then(data => {
            // Redirigir a la URL de autenticación de Google
            window.location.href = data.auth_url;
        })
        .catch(error => {
            console.error('Error al obtener URL de autenticación:', error);
            alert('Error al conectar con el servidor. Por favor, intenta de nuevo más tarde.');
            cerrarModalAuth();
        });
}

// Función para sincronizar correos después de la autenticación
function sincronizarCorreosAutenticado(credentials) {
    // Mostrar indicador de carga
    document.getElementById('sincronizar-correos-btn').textContent = 'Sincronizando...';
    document.getElementById('sincronizar-correos-btn').disabled = true;
    
    // Obtener el mes seleccionado
    const mesSeleccionado = document.getElementById('mes').value;
    
    // Llamar a la API para sincronizar correos
    fetch('/api/sync/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            credentials: credentials,
            mes: mesSeleccionado !== 'todos' ? mesSeleccionado : null
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Sincronización completada:', data);
        
        // Actualizar la fecha de sincronización con la fecha real de la API
        if (data.fecha_sincronizacion) {
            // Convertir la fecha a un formato más amigable
            const fechaObj = new Date(data.fecha_sincronizacion);
            const opciones = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            const fechaFormateada = fechaObj.toLocaleDateString('es-ES', opciones);
            
            // Actualizar el elemento en el DOM
            document.getElementById('fecha-sincronizacion').textContent = fechaFormateada;
        }
        
        // Actualizar la tabla de inquilinos con los pagos coincidentes
        if (data.matched_payments && data.matched_payments.length > 0) {
            // Actualizar el estado de pago de los inquilinos en la tabla
            data.matched_payments.forEach(payment => {
                const inquilinoIndex = inquilinos.findIndex(i => i.id === payment.inquilino_id);
                if (inquilinoIndex !== -1) {
                    inquilinos[inquilinoIndex].estado_pago = 'Pagado';
                }
            });
            
            // Actualizar la vista
            inquilinosFiltrados = filtrarInquilinosPorMes(mesActual);
            renderizarTablaInquilinos();
            calcularTotales();
            
            // Mostrar mensaje de éxito
            alert(`Sincronización completada. Se encontraron ${data.matched_payments.length} pagos coincidentes.`);
        } else {
            // Mostrar mensaje si no se encontraron pagos coincidentes
            alert('Sincronización completada. No se encontraron pagos coincidentes.');
        }
        
        // Restaurar el botón
        document.getElementById('sincronizar-correos-btn').textContent = 'Sincronizar Correos';
        document.getElementById('sincronizar-correos-btn').disabled = false;
    })
    .catch(error => {
        console.error('Error al sincronizar correos:', error);
        alert('Error al sincronizar correos. Por favor, intenta de nuevo más tarde.');
        
        // Restaurar el botón
        document.getElementById('sincronizar-correos-btn').textContent = 'Sincronizar Correos';
        document.getElementById('sincronizar-correos-btn').disabled = false;
    });
}

// Función auxiliar para filtrar inquilinos por mes
function filtrarInquilinosPorMes(mes) {
    if (mes === 'todos') {
        return [...inquilinos];
    } else {
        return inquilinos.filter(inquilino => {
            if (inquilino.mes) {
                return inquilino.mes === mes;
            }
            const id = inquilino.id;
            return id % 12 === (parseInt(mes) - 1) % 12;
        });
    }
}

// Verificar si hay credenciales en la URL (después de la autenticación de Google)
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const credentials = urlParams.get('credentials');
    
    if (credentials) {
        // Limpiar la URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Sincronizar correos con las credenciales obtenidas
        try {
            const credentialsObj = JSON.parse(decodeURIComponent(credentials));
            sincronizarCorreosAutenticado(credentialsObj);
        } catch (error) {
            console.error('Error al procesar credenciales:', error);
            alert('Error al procesar la autenticación. Por favor, intenta de nuevo.');
        }
    }
    
    // Cargar la fecha de última sincronización desde el servidor
    fetch('/api/sync/last')
        .then(response => response.json())
        .then(data => {
            if (data.fecha_sincronizacion) {
                // Convertir la fecha a un formato más amigable
                const fechaObj = new Date(data.fecha_sincronizacion);
                const opciones = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
                const fechaFormateada = fechaObj.toLocaleDateString('es-ES', opciones);
                
                // Actualizar el elemento en el DOM
                document.getElementById('fecha-sincronizacion').textContent = fechaFormateada;
            }
        })
        .catch(error => {
            console.error('Error al cargar la fecha de última sincronización:', error);
        });
});
