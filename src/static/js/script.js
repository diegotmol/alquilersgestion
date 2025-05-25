// Modificaciones al script.js para corregir la actualización de la fecha de sincronización

// Variables globales
let inquilinos = [];
let editandoId = null;
let inquilinosFiltrados = [];
let mesActual = null;

// Elementos DOM
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar la aplicación
    inicializarApp();

    // Event listeners
    document.getElementById('menu-button').addEventListener('click', toggleMenu);
    document.getElementById('ver-pagos-btn').addEventListener('click', verPagos);
    document.getElementById('anadir-inquilinos-btn').addEventListener('click', mostrarModalAnadirInquilino);
    document.getElementById('sincronizar-correos-btn').addEventListener('click', sincronizarCorreos);
    document.getElementById('mes').addEventListener('change', cambiarMes);
    document.getElementById('form-inquilino').addEventListener('submit', guardarInquilino);
    document.getElementById('btn-cancelar').addEventListener('click', cerrarModal);
    document.getElementById('btn-cancelar-auth').addEventListener('click', cerrarModalAuth);

    // Inicializar mes actual
    mesActual = document.getElementById('mes').value;

    // Verificar si hay credenciales en la URL (después de la autenticación de Google)
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
    cargarFechaSincronizacion();
});

// Función para cargar la fecha de última sincronización
function cargarFechaSincronizacion() {
    console.log('Cargando fecha de última sincronización...');
    fetch('/api/sync/last')
        .then(response => response.json())
        .then(data => {
            console.log('Respuesta de fecha de sincronización:', data);
            if (data.fecha_sincronizacion) {
                actualizarFechaSincronizacionUI(data.fecha_sincronizacion);
            } else {
                console.log('No se encontró fecha de sincronización');
                document.getElementById('fecha-sincronizacion').textContent = 'Nunca';
            }
        })
        .catch(error => {
            console.error('Error al cargar la fecha de última sincronización:', error);
            document.getElementById('fecha-sincronizacion').textContent = 'Error al cargar';
        });
}

// Función para actualizar la UI con la fecha de sincronización
function actualizarFechaSincronizacionUI(fechaIso) {
    try {
        console.log('Actualizando UI con fecha:', fechaIso);
        // Convertir la fecha ISO a objeto Date
        const fechaObj = new Date(fechaIso);
        
        // Verificar que la fecha es válida
        if (isNaN(fechaObj.getTime())) {
            console.error('Fecha inválida:', fechaIso);
            document.getElementById('fecha-sincronizacion').textContent = 'Formato de fecha inválido';
            return;
        }
        
        // Formatear la fecha para mostrarla
        const opciones = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'UTC'  // Asegurar que se interpreta como UTC
        };
        
        const fechaFormateada = fechaObj.toLocaleDateString('es-ES', opciones);
        console.log('Fecha formateada:', fechaFormateada);
        
        // Actualizar el elemento en el DOM
        document.getElementById('fecha-sincronizacion').textContent = fechaFormateada;
    } catch (error) {
        console.error('Error al formatear fecha:', error);
        document.getElementById('fecha-sincronizacion').textContent = 'Error al formatear fecha';
    }
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
            actualizarFechaSincronizacionUI(data.fecha_sincronizacion);
        } else {
            // Si no hay fecha en la respuesta, cargar la última fecha desde el servidor
            cargarFechaSincronizacion();
        }
        
        // Mostrar mensaje de resultado
        if (data.success) {
            alert(`Sincronización completada. ${data.mensaje}`);
            // Recargar inquilinos para reflejar cambios
            cargarInquilinos();
        } else {
            alert(`Error en la sincronización: ${data.mensaje}`);
        }
        
        // Restaurar botón
        document.getElementById('sincronizar-correos-btn').textContent = 'Sincronizar Correos';
        document.getElementById('sincronizar-correos-btn').disabled = false;
    })
    .catch(error => {
        console.error('Error al sincronizar correos:', error);
        alert('Error al conectar con el servidor. Por favor, intenta de nuevo más tarde.');
        
        // Restaurar botón
        document.getElementById('sincronizar-correos-btn').textContent = 'Sincronizar Correos';
        document.getElementById('sincronizar-correos-btn').disabled = false;
    });
}

// Resto del código original...
