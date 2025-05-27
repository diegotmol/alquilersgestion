// Variables globales
let inquilinos = [];
let editandoId = null;
let mesActual = null;
let anioActual = new Date().getFullYear(); // Año actual por defecto

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
            if (data.last_sync && data.last_sync.fecha_sincronizacion) {
                // Usar la función de formateo para hora chilena
                const fechaFormateada = formatearFechaChilena(data.last_sync.fecha_sincronizacion);
                document.getElementById('fecha-sincronizacion').textContent = fechaFormateada;
            }
        })
        .catch(error => {
            console.error('Error al cargar la fecha de última sincronización:', error);
        });
});

// Función para formatear fechas en hora chilena
function formatearFechaChilena(fechaIso) {
    if (!fechaIso) return 'Nunca';
    
    try {
        // Convertir la fecha ISO a objeto Date
        const fechaObj = new Date(fechaIso);
        
        // Verificar que la fecha es válida
        if (isNaN(fechaObj.getTime())) {
            console.error('Fecha inválida:', fechaIso);
            return 'Formato de fecha inválido';
        }
        
        // Formatear la fecha para mostrarla en hora chilena
        const opciones = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'America/Santiago'  // Zona horaria de Chile
        };
        
        return fechaObj.toLocaleDateString('es-ES', opciones);
    } catch (error) {
        console.error('Error al formatear fecha:', error);
        return 'Error al formatear fecha';
    }
}

// Inicializar la aplicación
function inicializarApp() {
    cargarInquilinos();
}

// Toggle menú lateral
function toggleMenu() {
    console.log('Toggle menu clicked');
    const sidebar = document.getElementById('sidebar');
    
    // Alternar la clase active en el sidebar
    sidebar.classList.toggle('active');
    
    console.log('Menú lateral toggled');
}

// Cargar inquilinos desde la API
function cargarInquilinos() {
    fetch('/api/inquilinos/')
        .then(response => response.json())
        .then(data => {
            inquilinos = data;
            renderizarTablaInquilinos();
            calcularTotales();
        })
        .catch(error => {
            console.error('Error al cargar socios:', error);
            // Si no hay conexión con el backend, usar datos de ejemplo para demostración
            cargarDatosEjemplo();
        });
}

// Cargar datos de ejemplo (solo para demostración si no hay backend)
function cargarDatosEjemplo() {
    inquilinos = [
        { id: 1, propietario: 'Juan Pérez', propiedad: 'Socio #001', telefono: '+56 9 12345678', monto: 800, estado_pago: 'No pagado' },
        { id: 2, propietario: 'Maria Gómez', propiedad: 'Socio #002', telefono: '+56 9 98765432', monto: 650, estado_pago: 'Pagado' },
        { id: 3, propietario: 'Carlos López', propiedad: 'Socio #003', telefono: '+56 9 55555555', monto: 1200, estado_pago: 'Pagado' },
        { id: 4, propietario: 'Ana Rodríguez', propiedad: 'Socio #004', telefono: '+56 9 87654321', monto: 750, estado_pago: 'Pagado' },
        { id: 5, propietario: 'Luis Martínez', propiedad: 'Socio #005', telefono: '+56 9 11112222', monto: 900, estado_pago: 'Pagado' }
    ];
    renderizarTablaInquilinos();
    calcularTotales();
}

// Renderizar tabla de inquilinos
function renderizarTablaInquilinos() {
    const tbody = document.getElementById('inquilinos-body');
    tbody.innerHTML = '';

    // Siempre usar todos los inquilinos, no filtrar por mes
    inquilinos.forEach(inquilino => {
        const tr = document.createElement('tr');
        
        // Determinar el estado de pago según el mes seleccionado
        let estadoPago = 'No pagado'; // Valor por defecto
        
        // Intentar obtener el estado de pago para el mes y año seleccionados
        const campoMesAnio = `pago_${mesActual}_${anioActual}`;
        console.log(`Buscando campo: ${campoMesAnio} para inquilino: ${inquilino.propietario}`);
        console.log('Campos disponibles:', Object.keys(inquilino));
        
        if (inquilino[campoMesAnio]) {
            estadoPago = inquilino[campoMesAnio];
            console.log(`Encontrado estado: ${estadoPago}`);
        } else {
            // Si no existe el campo específico, usar el estado_pago general
            estadoPago = inquilino.estado_pago;
            console.log(`No se encontró campo específico, usando estado general: ${estadoPago}`);
        }
        
        // Aplicar color según estado de pago
        const propietarioClass = estadoPago === 'Pagado' ? 'pagado' : 'no-pagado';
        
        tr.innerHTML = `
            <td class="${propietarioClass}">${inquilino.propietario}</td>
            <td>${inquilino.propiedad}</td>
            <td>${inquilino.telefono}</td>
            <td>$${inquilino.monto}</td>
            <td class="${propietarioClass}">${estadoPago}</td>
            <td>
                <button class="btn-accion btn-eliminar" onclick="eliminarInquilino(${inquilino.id})">Eliminar</button>
                <button class="btn-accion btn-editar" onclick="editarInquilino(${inquilino.id})">Editar</button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

// Calcular totales
function calcularTotales() {
    let totalMonto = 0;
    let totalPagado = 0;
    let totalNoPagado = 0;

    // Usar todos los inquilinos y determinar si están pagados según el mes seleccionado
    inquilinos.forEach(inquilino => {
        const monto = parseFloat(inquilino.monto);
        totalMonto += monto;
        
        // Determinar si está pagado según el mes y año seleccionados
        let pagado = false;
        
        // Intentar obtener el estado de pago para el mes y año seleccionados
        const campoMesAnio = `pago_${mesActual}_${anioActual}`;
        if (inquilino[campoMesAnio]) {
            pagado = inquilino[campoMesAnio] === 'Pagado';
        } else {
            // Si no existe el campo específico, usar el estado_pago general
            pagado = inquilino.estado_pago === 'Pagado';
        }
        
        if (pagado) {
            totalPagado += monto;
        } else {
            totalNoPagado += monto;
        }
    });

    document.getElementById('total-monto').textContent = `$${totalMonto}`;
    document.getElementById('total-pagado').textContent = `$${totalPagado}`;
    document.getElementById('total-no-pagado').textContent = `$${totalNoPagado}`;
}

// Ver pagos (oculta/muestra el menú lateral izquierdo)
function verPagos() {
    // Única función: ocultar/mostrar el menú lateral izquierdo
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
    console.log('Menú lateral toggled desde Ver Pagos');
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

    // Incluir el año en la sincronización
    // Llamar a la API para sincronizar correos
    fetch('/api/sync/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            credentials: credentials,
            mes: mesSeleccionado !== 'todos' ? mesSeleccionado : null,
            anio: anioActual.toString() // Usar anio en lugar de año para evitar problemas con la ñ
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Sincronización completada:', data);
        
        // Actualizar la fecha de sincronización con la fecha real de la API
        if (data.fecha_sincronizacion) {
            // Usar la función de formateo para hora chilena
            const fechaFormateada = formatearFechaChilena(data.fecha_sincronizacion);
            document.getElementById('fecha-sincronizacion').textContent = fechaFormateada;
        }
        
        // Mostrar mensaje de resultado
        alert(data.mensaje || 'Sincronización completada');
        
        // Restaurar botón
        document.getElementById('sincronizar-correos-btn').textContent = 'Sincronizar Correos';
        document.getElementById('sincronizar-correos-btn').disabled = false;
        
        // Recargar inquilinos para reflejar cambios
        cargarInquilinos();
    })
    .catch(error => {
        console.error('Error en sincronización:', error);
        alert('Error en sincronización. Por favor, intenta de nuevo más tarde.');
        
        // Restaurar botón
        document.getElementById('sincronizar-correos-btn').textContent = 'Sincronizar Correos';
        document.getElementById('sincronizar-correos-btn').disabled = false;
    });
}

// Cambiar mes
function cambiarMes() {
    const mesSeleccionado = document.getElementById('mes').value;
    const mesAnterior = mesActual;
    mesActual = mesSeleccionado;
    
    console.log(`Cambiando mes de ${mesAnterior} a ${mesActual}`);
    
    // Limpiar completamente la tabla antes de volver a renderizarla
    const tbody = document.getElementById('inquilinos-body');
    tbody.innerHTML = '';
    
    // Forzar un refresco visual con un pequeño retraso
    setTimeout(() => {
        // Renderizar la tabla con todos los inquilinos pero mostrando el estado
        // de pago correspondiente al mes seleccionado
        renderizarTablaInquilinos();
        calcularTotales();
        
        // Mostrar mensaje de confirmación
        console.log(`Tabla actualizada para el mes: ${mesActual}`);
    }, 50);
    
    // Actualizar visualmente el selector para confirmar el cambio
    const selector = document.getElementById('mes');
    selector.blur();
    setTimeout(() => selector.focus(), 100);
}

// Mostrar modal para añadir inquilino
function mostrarModalAnadirInquilino() {
    // Limpiar formulario
    document.getElementById('form-inquilino').reset();
    editandoId = null;
    
    // Mostrar modal
    document.getElementById('modal-inquilino').style.display = 'block';
}

// Cerrar modal
function cerrarModal() {
    document.getElementById('modal-inquilino').style.display = 'none';
}

// Cerrar modal de autenticación
function cerrarModalAuth() {
    document.getElementById('modal-google-auth').style.display = 'none';
}

// Guardar inquilino (nuevo o editado)
function guardarInquilino(event) {
    event.preventDefault();
    
    const propietario = document.getElementById('nombre').value;
    const propiedad = document.getElementById('propiedad').value;
    const telefono = document.getElementById('telefono').value;
    const monto = parseFloat(document.getElementById('monto').value);
    
    if (editandoId) {
        // Editar inquilino existente
        fetch(`/api/inquilinos/${editandoId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                propietario,
                propiedad,
                telefono,
                monto,
                estado_pago: 'No pagado'
            })
        })
        .then(response => response.json())
        .then(data => {
            cerrarModal();
            cargarInquilinos();
        })
        .catch(error => {
            console.error('Error al actualizar socio:', error);
            alert('Error al actualizar socio. Por favor, intenta de nuevo.');
        });
    } else {
        // Añadir nuevo inquilino
        fetch('/api/inquilinos/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                propietario,
                propiedad,
                telefono,
                monto,
                estado_pago: 'No pagado'
            })
        })
        .then(response => response.json())
        .then(data => {
            cerrarModal();
            cargarInquilinos();
        })
        .catch(error => {
            console.error('Error al añadir socio:', error);
            alert('Error al añadir socio. Por favor, intenta de nuevo.');
            
            // Si no hay conexión con el backend, simular añadir inquilino (solo para demostración)
            const nuevoInquilino = {
                id: inquilinos.length + 1,
                propietario,
                propiedad,
                telefono,
                monto,
                estado_pago: 'No pagado'
            };
            
            inquilinos.push(nuevoInquilino);
            cerrarModal();
            cambiarMes(); // Esto actualizará la tabla
        });
    }
}

// Editar inquilino
function editarInquilino(id) {
    const inquilino = inquilinos.find(i => i.id === id);
    if (!inquilino) return;
    
    editandoId = id;
    
    document.getElementById('nombre').value = inquilino.propietario;
    document.getElementById('propiedad').value = inquilino.propiedad;
    document.getElementById('telefono').value = inquilino.telefono;
    document.getElementById('monto').value = inquilino.monto;
    
    document.getElementById('modal-inquilino').style.display = 'block';
}

// Eliminar inquilino
function eliminarInquilino(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar este socio?')) return;
    
    fetch(`/api/inquilinos/${id}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        cargarInquilinos();
    })
    .catch(error => {
        console.error('Error al eliminar socio:', error);
        alert('Error al eliminar socio. Por favor, intenta de nuevo.');
        
        // Si no hay conexión con el backend, simular eliminación (solo para demostración)
        inquilinos = inquilinos.filter(i => i.id !== id);
        cambiarMes(); // Esto actualizará la tabla
    });
}

// Obtener número de mes a partir del nombre
function obtenerNumeroMes(nombreMes) {
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
    
    return meses[nombreMes.toLowerCase()] || '01';
}
