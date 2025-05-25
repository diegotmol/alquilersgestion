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

// Filtrar inquilinos por mes (solo se llama cuando cambia el selector de mes)
function filtrarPorMes() {
    const mesSeleccionado = document.getElementById('mes').value;
    mesActual = mesSeleccionado;

    // En un entorno real, esto podría ser una llamada a la API con filtro
    // Para la demostración, filtramos los datos locales
    inquilinosFiltrados = filtrarInquilinosPorMes(mesSeleccionado);

    // Actualizamos la interfaz con los datos filtrados
    renderizarTablaInquilinos();
    calcularTotales();
}

// Función auxiliar para filtrar inquilinos por mes
function filtrarInquilinosPorMes(mes) {
    if (mes === 'todos') {
        return [...inquilinos];
    } else {
        return inquilinos.filter(inquilino => {
            // Si el inquilino tiene un campo mes, lo usamos para filtrar
            if (inquilino.mes) {
                return inquilino.mes === mes;
            }
            // Si no tiene campo mes, usamos un algoritmo simple para simular
            const id = inquilino.id;
            return id % 12 === (parseInt(mes) - 1) % 12;
        });
    }
}

// Función para cambiar el mes seleccionado
function cambiarMes() {
    mesActual = document.getElementById('mes').value;
    filtrarPorMes();
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
    
    // Cerrar el modal
    cerrarModal();
}

// Cerrar modal de inquilino
function cerrarModal() {
    const modal = document.getElementById('modal-inquilino');
    modal.style.display = 'none';
}

// Cerrar modal de autenticación
function cerrarModalAuth() {
    const modal = document.getElementById('modal-google-auth');
    modal.style.display = 'none';
}

// Función para editar inquilino
function editarInquilino(id) {
    const inquilino = inquilinos.find(i => i.id === id);
    if (!inquilino) return;
    
    const modal = document.getElementById('modal-inquilino');
    const modalTitulo = document.getElementById('modal-titulo');
    const form = document.getElementById('form-inquilino');
    
    modalTitulo.textContent = 'Editar Inquilino';
    
    document.getElementById('inquilino-id').value = inquilino.id;
    document.getElementById('nombre').value = inquilino.propietario;
    document.getElementById('propiedad').value = inquilino.propiedad;
    document.getElementById('telefono').value = inquilino.telefono;
    document.getElementById('rut').value = inquilino.rut || '';
    document.getElementById('monto').value = inquilino.monto;
    
    editandoId = inquilino.id;
    
    modal.style.display = 'block';
}

// Función para eliminar inquilino
function eliminarInquilino(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar este inquilino?')) {
        return;
    }
    
    fetch(`/api/inquilinos/${id}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (response.ok) {
            // Recargar la página automáticamente después de eliminar
            window.location.reload();
        } else {
            throw new Error('Error al eliminar inquilino');
        }
    })
    .catch(error => {
        console.error('Error al eliminar inquilino:', error);
        // Eliminación local para demostración
        inquilinos = inquilinos.filter(i => i.id !== id);
        inquilinosFiltrados = inquilinosFiltrados.filter(i => i.id !== id);
        renderizarTablaInquilinos();
        calcularTotales();
    });
}
