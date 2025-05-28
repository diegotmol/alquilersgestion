// Variables globales
let inquilinos = [];
let editandoId = null;
let mesActual = null;
let añoActual = new Date().getFullYear(); // Año actual por defecto

// Elementos DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM cargado completamente, inicializando aplicación...');
    try {
        // Inicializar la aplicación
        inicializarApp();
        
        // Event listeners
        configurarEventosBotones();
        
        // Inicializar mes actual
        mesActual = document.getElementById('mes').value;
        console.log('Mes inicial seleccionado:', mesActual);
        
        // Verificar si hay credenciales en la URL (después de la autenticación de Google)
        const urlParams = new URLSearchParams(window.location.search);
        const credentials = urlParams.get('credentials');
        
        if (credentials) {
            console.log('Credenciales detectadas en URL, procesando...');
            // Limpiar la URL
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Sincronizar correos con las credenciales obtenidas
            try {
                console.log('Intentando parsear credenciales:', credentials.substring(0, 50) + '...');
                // Manejar tanto formato JSON como string con comillas simples
                let credentialsObj;
                if (credentials.startsWith('{')) {
                    credentialsObj = JSON.parse(decodeURIComponent(credentials));
                } else {
                    // Reemplazar comillas simples por dobles para formato JSON válido
                    const jsonStr = decodeURIComponent(credentials).replace(/'/g, '"');
                    credentialsObj = JSON.parse(jsonStr);
                }
                
                console.log('Credenciales parseadas correctamente, iniciando sincronización...');
                // MODIFICACIÓN CLAVE: Primero cargar la tabla y luego sincronizar
                cargarInquilinos().then(() => {
                    sincronizarCorreosAutenticado(credentialsObj);
                });
            } catch (error) {
                console.error('Error al procesar credenciales:', error);
                console.error('Credenciales originales:', credentials);
                alert('Error al procesar la autenticación. Por favor, intenta de nuevo.');
            }
        } else {
            console.log('No se detectaron credenciales en la URL');
        }
        
        // Cargar la fecha de última sincronización desde el servidor
        cargarFechaUltimaSincronizacion();
    } catch (error) {
        console.error('Error durante la inicialización de la aplicación:', error);
        alert('Ocurrió un error al inicializar la aplicación. Por favor, recarga la página.');
    }
});

// Configurar todos los event listeners de botones
function configurarEventosBotones() {
    console.log('Configurando event listeners para botones...');
    try {
        const menuButton = document.getElementById('menu-button');
        if (menuButton) {
            menuButton.addEventListener('click', toggleMenu);
            console.log('Event listener configurado para menu-button');
        }
        
        const verPagosBtn = document.getElementById('ver-pagos-btn');
        if (verPagosBtn) {
            verPagosBtn.addEventListener('click', verPagos);
            console.log('Event listener configurado para ver-pagos-btn');
        }
        
        const anadirInquilinosBtn = document.getElementById('anadir-inquilinos-btn');
        if (anadirInquilinosBtn) {
            anadirInquilinosBtn.addEventListener('click', mostrarModalAnadirInquilino);
            console.log('Event listener configurado para anadir-inquilinos-btn');
        }
        
        const sincronizarCorreosBtn = document.getElementById('sincronizar-correos-btn');
        if (sincronizarCorreosBtn) {
            sincronizarCorreosBtn.addEventListener('click', sincronizarCorreos);
            console.log('Event listener configurado para sincronizar-correos-btn');
        }
        
        const mesSelector = document.getElementById('mes');
        if (mesSelector) {
            mesSelector.addEventListener('change', cambiarMes);
            console.log('Event listener configurado para selector de mes');
        }
        
        const formInquilino = document.getElementById('form-inquilino');
        if (formInquilino) {
            formInquilino.addEventListener('submit', guardarInquilino);
            console.log('Event listener configurado para form-inquilino');
        }
        
        const btnCancelar = document.getElementById('btn-cancelar');
        if (btnCancelar) {
            btnCancelar.addEventListener('click', cerrarModal);
            console.log('Event listener configurado para btn-cancelar');
        }
        
        const btnCancelarAuth = document.getElementById('btn-cancelar-auth');
        if (btnCancelarAuth) {
            btnCancelarAuth.addEventListener('click', cerrarModalAuth);
            console.log('Event listener configurado para btn-cancelar-auth');
        }
    } catch (error) {
        console.error('Error al configurar event listeners:', error);
    }
}

// Cargar fecha de última sincronización
function cargarFechaUltimaSincronizacion() {
    console.log('Cargando fecha de última sincronización...');
    fetch('/api/sync/last')
        .then(response => {
            console.log('Respuesta de API sync/last recibida:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('Datos de última sincronización:', data);
            if (data.last_sync && data.last_sync.fecha_sincronizacion) {
                // Usar la función de formateo para hora chilena
                const fechaFormateada = formatearFechaChilena(data.last_sync.fecha_sincronizacion);
                document.getElementById('fecha-sincronizacion').textContent = fechaFormateada;
                console.log('Fecha de sincronización actualizada:', fechaFormateada);
            }
        })
        .catch(error => {
            console.error('Error al cargar la fecha de última sincronización:', error);
        });
}

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
            timeZone: 'America/Santiago' // Zona horaria de Chile
        };
        
        return fechaObj.toLocaleDateString('es-ES', opciones);
    } catch (error) {
        console.error('Error al formatear fecha:', error);
        return 'Error al formatear fecha';
    }
}

// Inicializar la aplicación
function inicializarApp() {
    console.log('Inicializando aplicación...');
    cargarInquilinos();
}

// Toggle menú lateral - MODIFICADO para comportamiento push
function toggleMenu() {
    console.log('Toggle menu clicked');
    try {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            // Alternar la clase active en el sidebar
            sidebar.classList.toggle('active');
            console.log('Menú lateral toggled');
        } else {
            console.error('Elemento sidebar no encontrado');
        }
    } catch (error) {
        console.error('Error en toggleMenu:', error);
    }
}

// Cargar inquilinos desde la API
function cargarInquilinos() {
    console.log('Cargando inquilinos desde API...');
    return new Promise((resolve, reject) => {
        fetch('/api/inquilinos/')
            .then(response => {
                console.log('Respuesta de API inquilinos recibida:', response.status);
                return response.json();
            })
            .then(data => {
                console.log('Datos de inquilinos recibidos:', data.length, 'inquilinos');
                inquilinos = data;
                renderizarTablaInquilinos();
                calcularTotales();
                resolve(data);
            })
            .catch(error => {
                console.error('Error al cargar socios:', error);
                // Si no hay conexión con el backend, usar datos de ejemplo para demostración
                console.log('Cargando datos de ejemplo como respaldo...');
                cargarDatosEjemplo();
                resolve([]);
            });
    });
}

// Cargar datos de ejemplo (solo para demostración si no hay backend)
function cargarDatosEjemplo() {
    console.log('Cargando datos de ejemplo...');
    inquilinos = [
        {
            id: 1,
            propietario: 'Juan Pérez',
            propiedad: 'Socio #001',
            telefono: '+56 9 12345678',
            monto: 800,
            estado_pago: 'No pagado'
        },
        {
            id: 2,
            propietario: 'Maria Gómez',
            propiedad: 'Socio #002',
            telefono: '+56 9 98765432',
            monto: 650,
            estado_pago: 'Pagado'
        },
        {
            id: 3,
            propietario: 'Carlos López',
            propiedad: 'Socio #003',
            telefono: '+56 9 55555555',
            monto: 1200,
            estado_pago: 'Pagado'
        },
        {
            id: 4,
            propietario: 'Ana Rodríguez',
            propiedad: 'Socio #004',
            telefono: '+56 9 87654321',
            monto: 750,
            estado_pago: 'Pagado'
        },
        {
            id: 5,
            propietario: 'Luis Martínez',
            propiedad: 'Socio #005',
            telefono: '+56 9 11112222',
            monto: 900,
            estado_pago: 'Pagado'
        }
    ];
    renderizarTablaInquilinos();
    calcularTotales();
}

// Renderizar tabla de inquilinos
function renderizarTablaInquilinos() {
    console.log('Renderizando tabla de inquilinos...');
    const tbody = document.getElementById('inquilinos-body');
    if (!tbody) {
        console.error('Elemento inquilinos-body no encontrado');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (inquilinos.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="6" class="no-data">No hay socios registrados</td>';
        tbody.appendChild(tr);
        return;
    }
    
    inquilinos.forEach(inquilino => {
        const tr = document.createElement('tr');
        
        // Determinar el estado de pago según el mes seleccionado
        let estadoPago = inquilino.estado_pago || 'No pagado';
        
        // Si hay un mes específico seleccionado (no "todos")
        if (mesActual !== 'todos') {
            // Construir el nombre del campo para el mes y año actual (ej: pago_04_2025)
            const mesStr = mesActual.toString().padStart(2, '0');
            const campoMesAño = `pago_${mesStr}_${añoActual}`;
            
            console.log(`Buscando campo ${campoMesAño} para inquilino ${inquilino.id}`);
            
            if (inquilino[campoMesAño]) {
                estadoPago = inquilino[campoMesAño];
                console.log(`Campo ${campoMesAño} encontrado:`, estadoPago);
            } else {
                // Si no existe el campo específico, usar el estado_pago general
                estadoPago = inquilino.estado_pago || 'No pagado';
                console.log(`Campo ${campoMesAño} no encontrado, usando estado_pago general:`, estadoPago);
            }
        }
        
        // Aplicar clase según estado de pago
        const estadoClass = estadoPago === 'Pagado' ? 'pagado' : 'no-pagado';
        
        tr.innerHTML = `
            <td>${inquilino.propietario}</td>
            <td>${inquilino.propiedad}</td>
            <td>${inquilino.telefono}</td>
            <td>$${inquilino.monto.toLocaleString('es-CL')}</td>
            <td class="${estadoClass}">${estadoPago}</td>
            <td>
                <button class="btn-editar" data-id="${inquilino.id}">Editar</button>
                <button class="btn-eliminar" data-id="${inquilino.id}">Eliminar</button>
            </td>
        `;
        
        tbody.appendChild(tr);
        
        // Añadir event listeners a los botones
        const btnEditar = tr.querySelector('.btn-editar');
        if (btnEditar) {
            btnEditar.addEventListener('click', () => editarInquilino(inquilino.id));
        }
        
        const btnEliminar = tr.querySelector('.btn-eliminar');
        if (btnEliminar) {
            btnEliminar.addEventListener('click', () => eliminarInquilino(inquilino.id));
        }
    });
}

// Calcular totales
function calcularTotales() {
    console.log('Calculando totales...');
    let totalMonto = 0;
    let totalPagado = 0;
    let totalNoPagado = 0;
    
    inquilinos.forEach(inquilino => {
        const monto = parseFloat(inquilino.monto) || 0;
        totalMonto += monto;
        
        // Determinar si está pagado según el mes seleccionado
        let estadoPago = inquilino.estado_pago || 'No pagado';
        
        // Si hay un mes específico seleccionado (no "todos")
        if (mesActual !== 'todos') {
            // Construir el nombre del campo para el mes y año actual (ej: pago_04_2025)
            const mesStr = mesActual.toString().padStart(2, '0');
            const campoMesAño = `pago_${mesStr}_${añoActual}`;
            
            if (inquilino[campoMesAño]) {
                estadoPago = inquilino[campoMesAño];
            }
        }
        
        if (estadoPago === 'Pagado') {
            totalPagado += monto;
        } else {
            totalNoPagado += monto;
        }
    });
    
    // Actualizar los elementos en el DOM
    document.getElementById('total-monto').textContent = `$${totalMonto.toLocaleString('es-CL')}`;
    document.getElementById('total-pagado').textContent = `$${totalPagado.toLocaleString('es-CL')}`;
    document.getElementById('total-no-pagado').textContent = `$${totalNoPagado.toLocaleString('es-CL')}`;
}

// Cambiar mes seleccionado
function cambiarMes() {
    console.log('Cambiando mes seleccionado...');
    const mesSelector = document.getElementById('mes');
    mesActual = mesSelector.value;
    console.log('Nuevo mes seleccionado:', mesActual);
    
    renderizarTablaInquilinos();
    calcularTotales();
}

// Ver pagos (actualmente solo recarga la tabla)
function verPagos() {
    console.log('Ver pagos clicked');
    cargarInquilinos();
}

// Mostrar modal para añadir inquilino
function mostrarModalAnadirInquilino() {
    console.log('Mostrar modal añadir inquilino');
    // Resetear el formulario
    document.getElementById('form-inquilino').reset();
    document.getElementById('inquilino-id').value = '';
    document.getElementById('modal-titulo').textContent = 'Añadir Socio';
    document.getElementById('btn-agregar').textContent = 'Agregar';
    
    // Mostrar el modal
    document.getElementById('modal-inquilino').style.display = 'block';
    
    // Resetear el ID de edición
    editandoId = null;
}

// Cerrar modal
function cerrarModal() {
    console.log('Cerrar modal');
    document.getElementById('modal-inquilino').style.display = 'none';
}

// Cerrar modal de autenticación
function cerrarModalAuth() {
    console.log('Cerrar modal auth');
    document.getElementById('modal-google-auth').style.display = 'none';
}

// Guardar inquilino (nuevo o editado)
function guardarInquilino(event) {
    event.preventDefault();
    console.log('Guardando socio...');
    
    const id = document.getElementById('inquilino-id').value;
    const propietario = document.getElementById('nombre').value;
    const propiedad = document.getElementById('propiedad').value;
    const telefono = document.getElementById('telefono').value;
    const monto = parseFloat(document.getElementById('monto').value);
    
    const inquilino = {
        propietario,
        propiedad,
        telefono,
        monto
    };
    
    // Si hay ID, es una edición
    if (id) {
        inquilino.id = parseInt(id);
        actualizarInquilino(inquilino);
    } else {
        crearInquilino(inquilino);
    }
}

// Crear nuevo inquilino
function crearInquilino(inquilino) {
    console.log('Creando nuevo socio:', inquilino);
    
    fetch('/api/inquilinos/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(inquilino)
    })
    .then(response => {
        console.log('Respuesta de creación recibida:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('Socio creado:', data);
        cerrarModal();
        cargarInquilinos();
        alert('Socio añadido correctamente');
    })
    .catch(error => {
        console.error('Error al crear socio:', error);
        alert('Error al crear socio. Por favor, intenta de nuevo.');
    });
}

// Actualizar inquilino existente
function actualizarInquilino(inquilino) {
    console.log('Actualizando socio:', inquilino);
    
    fetch(`/api/inquilinos/${inquilino.id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(inquilino)
    })
    .then(response => {
        console.log('Respuesta de actualización recibida:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('Socio actualizado:', data);
        cerrarModal();
        cargarInquilinos();
        alert('Socio actualizado correctamente');
    })
    .catch(error => {
        console.error('Error al actualizar socio:', error);
        alert('Error al actualizar socio. Por favor, intenta de nuevo.');
    });
}

// Editar inquilino
function editarInquilino(id) {
    console.log('Editando socio con ID:', id);
    
    // Buscar el inquilino en el array
    const inquilino = inquilinos.find(i => i.id === id);
    if (!inquilino) {
        console.error('Socio no encontrado con ID:', id);
        return;
    }
    
    // Llenar el formulario con los datos del inquilino
    document.getElementById('inquilino-id').value = inquilino.id;
    document.getElementById('nombre').value = inquilino.propietario;
    document.getElementById('propiedad').value = inquilino.propiedad;
    document.getElementById('telefono').value = inquilino.telefono;
    document.getElementById('monto').value = inquilino.monto;
    
    // Cambiar el título y texto del botón
    document.getElementById('modal-titulo').textContent = 'Editar Socio';
    document.getElementById('btn-agregar').textContent = 'Actualizar';
    
    // Mostrar el modal
    document.getElementById('modal-inquilino').style.display = 'block';
    
    // Guardar el ID que se está editando
    editandoId = id;
}

// Eliminar inquilino
function eliminarInquilino(id) {
    console.log('Eliminando socio con ID:', id);
    
    if (confirm('¿Estás seguro de que deseas eliminar este socio?')) {
        fetch(`/api/inquilinos/${id}`, {
            method: 'DELETE'
        })
        .then(response => {
            console.log('Respuesta de eliminación recibida:', response.status);
            if (response.ok) {
                cargarInquilinos();
                alert('Socio eliminado correctamente');
            } else {
                return response.json().then(data => {
                    throw new Error(data.mensaje || 'Error al eliminar socio');
                });
            }
        })
        .catch(error => {
            console.error('Error al eliminar socio:', error);
            alert('Error al eliminar socio. Por favor, intenta de nuevo.');
        });
    }
}

// Función para sincronizar correos - MODIFICADA
function sincronizarCorreos() {
    console.log('Iniciando sincronización de correos...');
    
    // Obtener el mes seleccionado del selector
    const mesSeleccionado = document.getElementById('mes').value;
    console.log('Mes seleccionado antes de guardar en sessionStorage:', mesSeleccionado);
    
    // Guardar el mes seleccionado en sessionStorage para usarlo después de la autenticación
    sessionStorage.setItem('mesSeleccionado', mesSeleccionado);
    console.log('Mes guardado en sessionStorage:', mesSeleccionado);
    
    // Solicitar URL de autenticación
    fetch('/api/auth/url')
        .then(response => response.json())
        .then(data => {
            if (data.auth_url) {
                // Redirigir a la URL de autenticación
                window.location.href = data.auth_url;
            } else {
                alert('Error al obtener URL de autenticación');
            }
        })
        .catch(error => {
            console.error('Error al solicitar URL de autenticación:', error);
            alert('Error al solicitar URL de autenticación');
        });
}

// Función para sincronizar correos después de autenticación - MODIFICADA
function sincronizarCorreosAutenticado(credentials) {
    console.log('Iniciando sincronización con credenciales...');
    
    // Recuperar el mes seleccionado de sessionStorage
    let mesSeleccionado = sessionStorage.getItem('mesSeleccionado') || document.getElementById('mes').value;
    console.log('Mes recuperado de sessionStorage:', mesSeleccionado);
    
    // Asegurar que el valor es el correcto (sin conversiones innecesarias)
    if (!isNaN(mesSeleccionado) && mesSeleccionado >= 1 && mesSeleccionado <= 12) {
        console.log('Mes válido, enviando al backend:', mesSeleccionado);
    } else {
        console.error('Valor de mes inválido:', mesSeleccionado);
        // Usar un valor por defecto si es inválido
        mesSeleccionado = '4'; // Abril como fallback
        console.log('Usando mes por defecto:', mesSeleccionado);
    }
    
    const añoActual = new Date().getFullYear();
    
    // Mostrar modal de sincronización
    document.getElementById('modal-sincronizacion').style.display = 'block';
    
    // Enviar solicitud al backend con el mes correcto
    fetch('/api/sync/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            credentials: credentials,
            mes: mesSeleccionado,  // Aseguramos que se envía el valor correcto
            año: añoActual
        })
    })
    .then(response => {
        console.log('Respuesta de sincronización recibida:', response.status);
        return response.json();
    })
    .then(data => {
        // Ocultar modal de sincronización
        document.getElementById('modal-sincronizacion').style.display = 'none';
        
        console.log('Datos de sincronización:', data);
        
        // Actualizar la fecha de última sincronización
        if (data.fecha_sincronizacion) {
            const fechaFormateada = formatearFechaChilena(data.fecha_sincronizacion);
            document.getElementById('fecha-sincronizacion').textContent = fechaFormateada;
        }
        
        // Mostrar mensaje de éxito
        alert(data.mensaje);
        
        // Recargar inquilinos para mostrar los cambios
        cargarInquilinos();
    })
    .catch(error => {
        // Ocultar modal de sincronización
        document.getElementById('modal-sincronizacion').style.display = 'none';
        console.error('Error en sincronización:', error);
        alert('Error en sincronización. Por favor, intenta de nuevo.');
    });
}
