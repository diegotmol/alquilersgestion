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

// Cargar datos de ejemplo (solo para demostración si no hay backend)
function cargarDatosEjemplo() {
    inquilinos = [
        { id: 1, propietario: 'Juan Pérez', propiedad: 'Casa en Santiago', telefono: '+56 9 12345678', monto: 800, estado_pago: 'No pagado', mes: '1' },
        { id: 2, propietario: 'Maria Gómez', propiedad: 'Departamento en Valparaíso', telefono: '+56 9 98765432', monto: 650, estado_pago: 'Pagado', mes: '1' },
        { id: 3, propietario: 'Carlos López', propiedad: 'Oficina en Concepción', telefono: '+56 9 55555555', monto: 1200, estado_pago: 'Pagado', mes: '2' },
        { id: 4, propietario: 'Ana Rodríguez', propiedad: 'Departamento en Santiago', telefono: '+56 9 87654321', monto: 750, estado_pago: 'Pagado', mes: '3' },
        { id: 5, propietario: 'Luis Martínez', propiedad: 'Casa en Valparaíso', telefono: '+56 9 11112222', monto: 900, estado_pago: 'Pagado', mes: '4' }
    ];
    inquilinosFiltrados = [...inquilinos]; // Inicialmente todos los inquilinos
    renderizarTablaInquilinos();
    calcularTotales();
}

// Renderizar tabla de inquilinos
function renderizarTablaInquilinos() {
    const tbody = document.getElementById('inquilinos-body');
    tbody.innerHTML = '';
    
    // Usar inquilinosFiltrados en lugar de inquilinos
    inquilinosFiltrados.forEach(inquilino => {
        const tr = document.createElement('tr');
        
        // Aplicar color según estado de pago
        const propietarioClass = inquilino.estado_pago === 'Pagado' ? 'pagado' : 'no-pagado';
        
        tr.innerHTML = `
            <td class="${propietarioClass}">${inquilino.propietario}</td>
            <td>${inquilino.propiedad}</td>
            <td>${inquilino.telefono}</td>
            <td>$${inquilino.monto}</td>
            <td class="${propietarioClass}">${inquilino.estado_pago}</td>
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
    
    // Usar inquilinosFiltrados en lugar de inquilinos para los cálculos
    inquilinosFiltrados.forEach(inquilino => {
        totalMonto += inquilino.monto;
        
        if (inquilino.estado_pago === 'Pagado') {
            totalPagado += inquilino.monto;
        } else {
            totalNoPagado += inquilino.monto;
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
    if (sidebar.style.display === 'none' || sidebar.style.display === '') {
        sidebar.style.display = 'block';
        console.log('Mostrando menú lateral izquierdo');
    } else {
        sidebar.style.display = 'none';
        console.log('Ocultando menú lateral izquierdo');
    }
}

// Filtrar inquilinos por mes (solo se llama cuando cambia el selector de mes)
function filtrarPorMes() {
    const mesSeleccionado = document.getElementById('mes').value;
    mesActual = mesSeleccionado;
    
    // En un entorno real, esto podría ser una llamada a la API con filtro
    // Para la demostración, filtramos los datos locales
    if (mesSeleccionado === 'todos') {
        inquilinosFiltrados = [...inquilinos];
    } else {
        // Simulamos filtrado por mes (en datos reales, cada inquilino tendría un campo de mes)
        // Para la demostración, asignamos meses aleatorios a los inquilinos
        inquilinosFiltrados = inquilinos.filter(inquilino => {
            // Si el inquilino tiene un campo mes, lo usamos para filtrar
            if (inquilino.mes) {
                return inquilino.mes === mesSeleccionado;
            }
            // Si no tiene campo mes, usamos un algoritmo simple para simular
            const id = inquilino.id;
            return id % 12 === (parseInt(mesSeleccionado) - 1) % 12;
        });
    }
    
    // Actualizamos la interfaz con los datos filtrados
    renderizarTablaInquilinos();
    calcularTotales();
}

// Mostrar modal para añadir inquilino
function mostrarModalAnadirInquilino() {
    const modal = document.getElementById('modal-inquilino');
    const modalTitulo = document.getElementById('modal-titulo');
    const form = document.getElementById('form-inquilino');
    
    modalTitulo.textContent = 'Añadir Inquilino';
    form.reset();
    editandoId = null;
    
    modal.style.display = 'block';
}

// Guardar inquilino (crear o actualizar)
function guardarInquilino(event) {
    event.preventDefault();
    
    const nombre = document.getElementById('nombre').value;
    const propiedad = document.getElementById('propiedad').value;
    const telefono = document.getElementById('telefono').value;
    const rut = document.getElementById('rut').value;
    const monto = parseFloat(document.getElementById('monto').value);
    
    const inquilino = {
        propietario: nombre,
        propiedad: propiedad,
        telefono: telefono,
        rut: rut,
        monto: monto,
        estado_pago: 'No pagado',
        mes: mesActual // Asignamos el mes actual al nuevo inquilino
    };
    
    if (editandoId) {
        // Actualizar inquilino existente
        fetch(`/api/inquilinos/${editandoId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(inquilino)
        })
        .then(response => response.json())
        .then(data => {
            // Recargar la página automáticamente después de editar
            window.location.reload();
        })
        .catch(error => {
            console.error('Error al actualizar inquilino:', error);
            // Actualización local para demostración
            const index = inquilinos.findIndex(i => i.id === editandoId);
            if (index !== -1) {
                inquilino.id = editandoId;
                inquilino.estado_pago = inquilinos[index].estado_pago;
                inquilinos[index] = inquilino;
            }
            // Recargar la página automáticamente incluso en caso de error
            window.location.reload();
        });
    } else {
        // Crear nuevo inquilino
        fetch('/api/inquilinos/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(inquilino)
        })
        .then(response => response.json())
        .then(data => {
            // Recargar la página automáticamente después de añadir
            window.location.reload();
        })
        .catch(error => {
            console.error('Error al crear inquilino:', error);
            // Creación local para demostración
            inquilino.id = inquilinos.length > 0 ? Math.max(...inquilinos.map(i => i.id)) + 1 : 1;
            inquilinos.push(inquilino);
            // Recargar la página automáticamente incluso en caso de error
            window.location.reload();
        });
    }
}

// Editar inquilino
function editarInquilino(id) {
    const inquilino = inquilinos.find(i => i.id === id);
    if (!inquilino) return;
    
    const modal = document.getElementById('modal-inquilino');
    const modalTitulo = document.getElementById('modal-titulo');
    
    document.getElementById('nombre').value = inquilino.propietario;
    document.getElementById('propiedad').value = inquilino.propiedad;
    document.getElementById('telefono').value = inquilino.telefono;
    document.getElementById('rut').value = inquilino.rut || '';
    document.getElementById('monto').value = inquilino.monto;
    
    modalTitulo.textContent = 'Editar Inquilino';
    editandoId = id;
    
    modal.style.display = 'block';
}

// Eliminar inquilino
function eliminarInquilino(id) {
    if (confirm('¿Estás seguro de que deseas eliminar este inquilino?')) {
        fetch(`/api/inquilinos/${id}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (response.ok) {
                // Recargar la página automáticamente después de eliminar
                window.location.reload();
            }
        })
        .catch(error => {
            console.error('Error al eliminar inquilino:', error);
            // Eliminación local para demostración
            inquilinos = inquilinos.filter(i => i.id !== id);
            // Recargar la página automáticamente incluso en caso de error
            window.location.reload();
        });
    }
}

// Cerrar modal
function cerrarModal() {
    const modal = document.getElementById('modal-inquilino');
    modal.style.display = 'none';
}

// Sincronizar correos
function sincronizarCorreos() {
    // Verificar primero si el usuario está autenticado
    fetch('/api/auth/status')
        .then(response => response.json())
        .then(data => {
            if (data.authenticated) {
                // Usuario ya autenticado, proceder con la sincronización
                realizarSincronizacion();
            } else {
                // Usuario no autenticado, redirigir a la página de login de Google
                window.location.href = '/api/auth/login';
            }
        })
        .catch(error => {
            console.error('Error al verificar estado de autenticación:', error);
            alert('Error al verificar el estado de autenticación. Por favor, intente nuevamente.');
        });
}

// Realizar la sincronización de correos
function realizarSincronizacion() {
    const modalAuth = document.getElementById('modal-google-auth');
    modalAuth.style.display = 'block';
    
    // Mostrar mensaje de procesamiento
    const fechaActual = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('fecha-sincronizacion').textContent = fechaActual.toLocaleDateString('es-ES', options) + ' (Sincronizando...)';
    
    // Obtener el mes seleccionado
    const mesSeleccionado = document.getElementById('mes').value;
    
    // Llamar a la API de sincronización
    setTimeout(() => {
        fetch('/api/sync/sincronizar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                mes: mesSeleccionado,
                // No necesitamos enviar las credenciales explícitamente
                // El backend las recuperará de la sesión
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Resultados de sincronización:', data);
            
            // Actualizar la fecha de sincronización
            document.getElementById('fecha-sincronizacion').textContent = fechaActual.toLocaleDateString('es-ES', options);
            
            // Cerrar el modal de autenticación
            cerrarModalAuth();
            
            // Mostrar resultados
            alert(`Sincronización completada:\n- Correos procesados: ${data.total_emails}\n- Transferencias encontradas: ${data.processed_emails || 0}\n- Pagos actualizados: ${data.matched_payments ? data.matched_payments.length : 0}`);
            
            // Recargar la página para mostrar los cambios
            window.location.reload();
        })
        .catch(error => {
            console.error('Error en sincronización:', error);
            document.getElementById('fecha-sincronizacion').textContent = fechaActual.toLocaleDateString('es-ES', options) + ' (Error)';
            cerrarModalAuth();
            alert('Error al sincronizar correos. Por favor, intente nuevamente.');
        });
    }, 2000); // Simular tiempo de procesamiento
}

// Cerrar modal de autenticación
function cerrarModalAuth() {
    const modalAuth = document.getElementById('modal-google-auth');
    modalAuth.style.display = 'none';
}

// Cambiar mes seleccionado
function cambiarMes() {
    // Aplicamos el filtro por mes
    filtrarPorMes();
    
    // Actualizamos la fecha de sincronización
    const fechaActual = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('fecha-sincronizacion').textContent = fechaActual.toLocaleDateString('es-ES', options);
}

// Simular verificación de pagos (para demostración)
function simularVerificacionPagos() {
    // Guardamos el filtro actual para mantenerlo después de la sincronización
    const mesSeleccionado = document.getElementById('mes').value;
    
    // Actualizamos aleatoriamente el estado de pago de los inquilinos
    // pero mantenemos la misma lista de inquilinos sin filtrar
    inquilinos.forEach(inquilino => {
        // Simulamos que algunos inquilinos han pagado
        const hasPagado = Math.random() > 0.5;
        inquilino.estado_pago = hasPagado ? 'Pagado' : 'No pagado';
        
        // En un caso real, aquí se enviaría la actualización al servidor
        actualizarEstadoPago(inquilino.id, inquilino.estado_pago);
    });
    
    // Cerramos el modal de autenticación
    cerrarModalAuth();
    
    // Recargar la página automáticamente después de sincronizar correos
    window.location.reload();
}

// Actualizar estado de pago en el servidor
function actualizarEstadoPago(id, estado) {
    fetch('/api/inquilinos/actualizar-estado', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id: id,
            estado_pago: estado
        })
    })
    .catch(error => {
        console.error('Error al actualizar estado de pago:', error);
    });
}

// Función para actualización periódica (ya no es necesaria con la recarga automática)
// La dejamos comentada por si se quiere volver a implementar en el futuro
/*
function iniciarActualizacionTiempoReal() {
    // Actualizar cada 30 segundos
    setInterval(() => {
        // Guardamos los inquilinos filtrados actuales
        const idsActuales = inquilinosFiltrados.map(i => i.id);
        
        // Cargamos los datos nuevos
        fetch('/api/inquilinos/')
            .then(response => response.json())
            .then(data => {
                inquilinos = data;
                
                // Mantenemos el mismo filtro que teníamos antes
                if (mesActual === 'todos') {
                    inquilinosFiltrados = [...inquilinos];
                } else {
                    // Aplicamos el mismo filtro pero con los datos actualizados
                    inquilinosFiltrados = inquilinos.filter(inquilino => {
                        if (inquilino.mes) {
                            return inquilino.mes === mesActual;
                        }
                        const id = inquilino.id;
                        return id % 12 === (parseInt(mesActual) - 1) % 12;
                    });
                }
                
                // Actualizamos la interfaz
                renderizarTablaInquilinos();
                calcularTotales();
            })
            .catch(error => {
                console.error('Error al actualizar datos en tiempo real:', error);
            });
    }, 30000);
}

// Iniciar actualización en tiempo real
iniciarActualizacionTiempoReal();
*/
