/**
 * Script JavaScript corregido para la aplicación de gestión de pagos de alquileres.
 * Esta versión corrige la actualización de la tabla y el mensaje de transferencias/pagos.
 */

// Variables globales
let inquilinos = [];
let mesSeleccionado = '';
let añoSeleccionado = '';

// Función que se ejecuta cuando el documento está listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('Documento cargado, inicializando aplicación...');
    
    // Obtener el mes y año seleccionados
    const selectMes = document.getElementById('selectMes');
    if (selectMes) {
        mesSeleccionado = selectMes.value;
        selectMes.addEventListener('change', function() {
            mesSeleccionado = this.value;
            cargarInquilinos();
        });
    }
    
    // Inicializar la aplicación
    inicializarApp();
    
    // Verificar si hay credenciales en la URL (después de autenticación)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('credentials')) {
        const credentials = JSON.parse(decodeURIComponent(urlParams.get('credentials')));
        console.log('Credenciales recibidas, guardando en localStorage');
        localStorage.setItem('gmail_credentials', JSON.stringify(credentials));
        
        // Limpiar la URL
        window.history.replaceState({}, document.title, '/');
        
        // Sincronizar automáticamente
        sincronizarCorreos();
    }
});

// Inicializar la aplicación
function inicializarApp() {
    console.log('Inicializando aplicación...');
    
    // Cargar la última fecha de sincronización
    cargarUltimaSincronizacion();
    
    // Cargar los inquilinos
    cargarInquilinos();
    
    // Configurar botón de sincronización
    const btnSincronizar = document.getElementById('btnSincronizar');
    if (btnSincronizar) {
        btnSincronizar.addEventListener('click', sincronizarCorreos);
    }
}

// Cargar la última fecha de sincronización
function cargarUltimaSincronizacion() {
    console.log('Cargando última fecha de sincronización...');
    
    fetch('/api/sync/last')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.fecha_sincronizacion) {
                const fecha = new Date(data.fecha_sincronizacion);
                const fechaFormateada = `${fecha.getDate()} de ${obtenerNombreMes(fecha.getMonth())} de ${fecha.getFullYear()}, ${fecha.getHours()}:${String(fecha.getMinutes()).padStart(2, '0')}`;
                document.getElementById('ultimaSincronizacion').textContent = fechaFormateada;
            }
        })
        .catch(error => {
            console.error('Error al cargar última sincronización:', error);
        });
}

// Cargar los inquilinos
function cargarInquilinos() {
    console.log('Cargando inquilinos...');
    
    fetch('/api/inquilinos/')
        .then(response => response.json())
        .then(data => {
            inquilinos = data;
            actualizarTablaInquilinos();
        })
        .catch(error => {
            console.error('Error al cargar inquilinos:', error);
        });
}

// Actualizar la tabla de inquilinos
function actualizarTablaInquilinos() {
    console.log('Actualizando tabla de inquilinos...');
    
    const tbody = document.querySelector('table tbody');
    if (!tbody) return;
    
    // Limpiar la tabla
    tbody.innerHTML = '';
    
    // Obtener el mes y año para la columna de pago
    const selectMes = document.getElementById('selectMes');
    if (!selectMes) return;
    
    const mesAño = selectMes.value.split(' ');
    if (mesAño.length !== 2) return;
    
    const mes = obtenerNumeroMes(mesAño[0]);
    const año = mesAño[1];
    
    // Nombre de la columna de pago
    const columnaPago = `pago_${mes}_${año}`;
    console.log(`Columna de pago a mostrar: ${columnaPago}`);
    
    // Variables para los totales
    let totalMonto = 0;
    let totalPagado = 0;
    let totalNoPagado = 0;
    
    // Agregar cada inquilino a la tabla
    inquilinos.forEach(inquilino => {
        const tr = document.createElement('tr');
        
        // Nombre del socio
        const tdNombre = document.createElement('td');
        tdNombre.textContent = inquilino.propietario;
        tdNombre.classList.add('nombre-socio');
        tr.appendChild(tdNombre);
        
        // Número de socio
        const tdNumero = document.createElement('td');
        tdNumero.textContent = inquilino.id;
        tr.appendChild(tdNumero);
        
        // Número de teléfono
        const tdTelefono = document.createElement('td');
        tdTelefono.textContent = inquilino.telefono || '';
        tr.appendChild(tdTelefono);
        
        // Monto a pagar
        const tdMonto = document.createElement('td');
        tdMonto.textContent = `$${inquilino.monto}`;
        tr.appendChild(tdMonto);
        
        // Estado de pago
        const tdEstado = document.createElement('td');
        // Verificar si existe la columna de pago para el mes seleccionado
        const estadoPago = inquilino[columnaPago] || 'No pagado';
        tdEstado.textContent = estadoPago;
        tdEstado.classList.add(estadoPago === 'Pagado' ? 'pagado' : 'no-pagado');
        tr.appendChild(tdEstado);
        
        // Acciones
        const tdAcciones = document.createElement('td');
        
        // Botón eliminar
        const btnEliminar = document.createElement('button');
        btnEliminar.textContent = 'Eliminar';
        btnEliminar.classList.add('btn', 'btn-danger', 'btn-sm', 'me-2');
        btnEliminar.addEventListener('click', () => eliminarInquilino(inquilino.id));
        tdAcciones.appendChild(btnEliminar);
        
        // Botón editar
        const btnEditar = document.createElement('button');
        btnEditar.textContent = 'Editar';
        btnEditar.classList.add('btn', 'btn-primary', 'btn-sm');
        btnEditar.addEventListener('click', () => editarInquilino(inquilino.id));
        tdAcciones.appendChild(btnEditar);
        
        tr.appendChild(tdAcciones);
        
        // Agregar la fila a la tabla
        tbody.appendChild(tr);
        
        // Actualizar totales
        totalMonto += parseFloat(inquilino.monto);
        if (estadoPago === 'Pagado') {
            totalPagado += parseFloat(inquilino.monto);
        } else {
            totalNoPagado += parseFloat(inquilino.monto);
        }
    });
    
    // Actualizar los totales en la interfaz
    document.getElementById('totalMonto').textContent = `$${totalMonto}`;
    document.getElementById('totalPagado').textContent = `$${totalPagado}`;
    document.getElementById('totalNoPagado').textContent = `$${totalNoPagado}`;
}

// Sincronizar correos
function sincronizarCorreos() {
    console.log('Iniciando sincronización de correos...');
    
    // Cambiar el texto del botón
    const btnSincronizar = document.getElementById('btnSincronizar');
    if (btnSincronizar) {
        const textoOriginal = btnSincronizar.textContent;
        btnSincronizar.textContent = 'Sincronizando...';
        btnSincronizar.disabled = true;
    }
    
    // Obtener credenciales
    const credentials = localStorage.getItem('gmail_credentials');
    
    // Si no hay credenciales, redirigir a la página de autenticación
    if (!credentials) {
        console.log('No hay credenciales, solicitando URL de autenticación...');
        
        fetch('/api/auth/url')
            .then(response => response.json())
            .then(data => {
                if (data.auth_url) {
                    window.location.href = data.auth_url;
                }
            })
            .catch(error => {
                console.error('Error al obtener URL de autenticación:', error);
                if (btnSincronizar) {
                    btnSincronizar.textContent = textoOriginal;
                    btnSincronizar.disabled = false;
                }
            });
        
        return;
    }
    
    // Obtener el mes seleccionado
    const selectMes = document.getElementById('selectMes');
    if (!selectMes) return;
    
    const mesAño = selectMes.value.split(' ');
    if (mesAño.length !== 2) return;
    
    const mes = obtenerNumeroMes(mesAño[0]);
    const año = mesAño[1];
    
    console.log(`Sincronizando correos para el mes ${mes} del año ${año}...`);
    
    // Realizar la sincronización
    fetch(`/api/sync?mes=${mes}&año=${año}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ credentials: JSON.parse(credentials) })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Respuesta de sincronización:', data);
        
        // Mostrar mensaje de resultado
        mostrarMensaje(`Se encontraron ${data.emails} transferencias. Se actualizaron ${data.pagos_actualizados} pagos.`);
        
        // Actualizar la fecha de última sincronización
        if (data.fecha_sincronizacion) {
            const fecha = new Date(data.fecha_sincronizacion);
            const fechaFormateada = `${fecha.getDate()} de ${obtenerNombreMes(fecha.getMonth())} de ${fecha.getFullYear()}, ${fecha.getHours()}:${String(fecha.getMinutes()).padStart(2, '0')}`;
            document.getElementById('ultimaSincronizacion').textContent = fechaFormateada;
        }
        
        // Recargar los inquilinos para actualizar la tabla
        cargarInquilinos();
        
        // Restaurar el botón
        if (btnSincronizar) {
            btnSincronizar.textContent = textoOriginal;
            btnSincronizar.disabled = false;
        }
    })
    .catch(error => {
        console.error('Error en sincronización:', error);
        mostrarMensaje('Error en la sincronización. Por favor, intenta nuevamente.');
        
        // Restaurar el botón
        if (btnSincronizar) {
            btnSincronizar.textContent = textoOriginal;
            btnSincronizar.disabled = false;
        }
    });
}

// Mostrar mensaje en la interfaz
function mostrarMensaje(mensaje) {
    // Crear el elemento de mensaje
    const mensajeElement = document.createElement('div');
    mensajeElement.classList.add('mensaje-popup');
    
    // Contenido del mensaje
    const contenido = document.createElement('div');
    contenido.classList.add('mensaje-contenido');
    
    // Título
    const titulo = document.createElement('h3');
    titulo.textContent = 'gestion-pagos-alquileres.onrender.com dice';
    contenido.appendChild(titulo);
    
    // Texto del mensaje
    const texto = document.createElement('p');
    texto.textContent = mensaje;
    contenido.appendChild(texto);
    
    // Botón de aceptar
    const boton = document.createElement('button');
    boton.textContent = 'Aceptar';
    boton.classList.add('btn', 'btn-primary');
    boton.addEventListener('click', () => {
        document.body.removeChild(mensajeElement);
    });
    contenido.appendChild(boton);
    
    mensajeElement.appendChild(contenido);
    
    // Agregar el mensaje al body
    document.body.appendChild(mensajeElement);
}

// Funciones auxiliares
function obtenerNombreMes(numero) {
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return meses[numero];
}

function obtenerNumeroMes(nombre) {
    const meses = {
        'enero': '01',
        'febrero': '02',
        'marzo': '03',
        'abril': '04',
        'mayo': '05',
        'junio': '06',
        'julio': '07',
        'agosto': '08',
        'septiembre': '09',
        'octubre': '10',
        'noviembre': '11',
        'diciembre': '12'
    };
    return meses[nombre.toLowerCase()] || '01';
}

// Funciones para editar y eliminar inquilinos (implementar según necesidad)
function eliminarInquilino(id) {
    console.log(`Eliminar inquilino con ID: ${id}`);
    // Implementar la lógica para eliminar inquilino
}

function editarInquilino(id) {
    console.log(`Editar inquilino con ID: ${id}`);
    // Implementar la lógica para editar inquilino
}
