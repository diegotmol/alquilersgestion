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
                // Mostrar mensaje de error en lugar de cargar datos de ejemplo
                alert('Error al conectar con la base de datos. Por favor, verifica la conexión.');
                inquilinos = []; // Vaciar el array de inquilinos
                renderizarTablaInquilinos(); // Renderizar tabla vacía
                calcularTotales(); // Calcular totales (serán cero)
                resolve([]);
            });
    });
}

// Renderizar tabla de inquilinos
function renderizarTablaInquilinos() {
    console.log('Renderizando tabla de inquilinos...');
    const tbody = document.getElementById('inquilinos-body');
    tbody.innerHTML = '';

    // MODIFICACIÓN: Siempre usar todos los inquilinos, no filtrar por mes
    inquilinos.forEach(inquilino => {
        const tr = document.createElement('tr');
        
        // Determinar el estado de pago según el mes seleccionado
        // Si existe la columna para el mes y año seleccionados, usar ese valor
        let estadoPago = 'No pagado'; // Valor por defecto
        
        // Intentar obtener el estado de pago para el mes y año seleccionados
        const campoMesAño = `pago_${mesActual}_${añoActual}`;
        if (inquilino[campoMesAño]) {
            estadoPago = inquilino[campoMesAño];
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
    console.log('Calculando totales para mes:', mesActual);
    try {
        let totalMonto = 0;
        let totalPagado = 0;
        let totalNoPagado = 0;

        // MODIFICACIÓN: Usar todos los inquilinos y determinar si están pagados según el mes seleccionado
        inquilinos.forEach(inquilino => {
            const monto = parseFloat(inquilino.monto) || 0;
            totalMonto += monto;
            
            // Determinar si está pagado según el mes y año seleccionados
            let pagado = false;
            
            // Intentar obtener el estado de pago para el mes y año seleccionados
            const campoMesAño = `pago_${mesActual}_${añoActual}`;
            if (inquilino[campoMesAño]) {
                pagado = inquilino[campoMesAño] === 'Pagado';
            }
            // Eliminada la referencia a estado_pago que ya no existe
            
            if (pagado) {
                totalPagado += monto;
            } else {
                totalNoPagado += monto;
            }
        });

        const totalMontoElement = document.getElementById('total-monto');
        const totalPagadoElement = document.getElementById('total-pagado');
        const totalNoPagadoElement = document.getElementById('total-no-pagado');
        
        if (totalMontoElement) totalMontoElement.textContent = `$${totalMonto}`;
        if (totalPagadoElement) totalPagadoElement.textContent = `$${totalPagado}`;
        if (totalNoPagadoElement) totalNoPagadoElement.textContent = `$${totalNoPagado}`;
        
        console.log('Totales calculados:', {totalMonto, totalPagado, totalNoPagado});
    } catch (error) {
        console.error('Error al calcular totales:', error);
    }
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

    // MODIFICACIÓN: Incluir el año en la sincronización
    // Llamar a la API para sincronizar correos
    fetch('/api/sync/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            credentials: credentials,
            mes: mesSeleccionado !== 'todos' ? mesSeleccionado : null,
            año: añoActual.toString() // Incluir el año actual
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

// Cambiar mes - VERSIÓN MEJORADA
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
                monto
            })
        })
        .then(response => response.json())
        .then(data => {
            cerrarModal();
            cargarInquilinos();
            alert('Socio actualizado correctamente');
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
                monto
            })
        })
        .then(response => response.json())
        .then(data => {
            cerrarModal();
            cargarInquilinos();
            alert('Socio añadido correctamente');
        })
        .catch(error => {
            console.error('Error al añadir socio:', error);
            alert('Error al añadir socio. Por favor, intenta de nuevo.');
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
    if (!confirm('¿Estás seguro de que deseas eliminar este socio?')) {
        return;
    }
    
    fetch(`/api/inquilinos/${id}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (response.ok) {
            // Eliminar inquilino del array local
            inquilinos = inquilinos.filter(i => i.id !== id);
            // Actualizar la tabla
            renderizarTablaInquilinos();
            calcularTotales();
            alert('Socio eliminado correctamente');
        } else {
            throw new Error('Error al eliminar socio');
        }
    })
    .catch(error => {
        console.error('Error al eliminar socio:', error);
        alert('Error al eliminar socio. Por favor, intenta de nuevo.');
    });
}
