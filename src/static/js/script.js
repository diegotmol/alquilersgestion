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
    fetch('/api/sync/last')
        .then(response => response.json())
        .then(data => {
            if (data) {
                // Convertir la fecha a un formato más amigable
                const fechaObj = new Date(data);
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

// Inicializar la aplicación
function inicializarApp() {
    cargarInquilinos();
}

// Toggle menú lateral
function toggleMenu() {
    console.log('Toggle menu clicked');
    const sidebar = document.getElementById('sidebar');
    if (sidebar.style.display === 'none' || sidebar.style.display === '') {
        sidebar.style.display = 'block';
        console.log('Mostrando menú');
    } else {
        sidebar.style.display = 'none';
        console.log('Ocultando menú');
    }
}

// Cargar inquilinos desde la API
function cargarInquilinos() {
    fetch('/api/inquilinos/')
        .then(response => response.json())
        .then(data => {
            inquilinos = data;
            inquilinosFiltrados = [...inquilinos]; // Inicialmente todos los inquilinos
            renderizarTablaInquilinos();
            calcularTotales();
        })
        .catch(error => {
            console.error('Error al cargar inquilinos:', error);
            // Si no hay conexión con el backend, usar datos de ejemplo para demostración
            cargarDatosEjemplo();
        });
}

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
        
        // Mostrar mensaje de resultado
        if (data.success) {
            alert(`Sincronización completada. ${data.mensaje}`);
            // Recargar inquilinos para reflejar cambios
            cargarInquilinos();
            
            // Actualizar la fecha de última sincronización
            fetch('/api/sync/last')
                .then(response => response.json())
                .then(fechaData => {
                    if (fechaData) {
                        // Convertir la fecha a un formato más amigable
                        const fechaObj = new Date(fechaData);
                        const opciones = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
                        const fechaFormateada = fechaObj.toLocaleDateString('es-ES', opciones);
                        
                        // Actualizar el elemento en el DOM
                        document.getElementById('fecha-sincronizacion').textContent = fechaFormateada;
                    }
                })
                .catch(error => {
                    console.error('Error al cargar la fecha de última sincronización:', error);
                });
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
