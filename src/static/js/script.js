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


// Cargar datos de ejemplo (solo para demostración si no hay backend)
function cargarDatosEjemplo() {
    console.log('Cargando datos de ejemplo...');
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
        
        console.log('Tabla de inquilinos renderizada correctamente');
    } catch (error) {
        console.error('Error al renderizar tabla de inquilinos:', error);
    }
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
    console.log('Función verPagos llamada');
    try {
        // Única función: ocultar/mostrar el menú lateral izquierdo
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.toggle('active');
            console.log('Menú lateral toggled desde Ver Pagos');
        } else {
            console.error('Elemento sidebar no encontrado');
        }
    } catch (error) {
        console.error('Error en verPagos:', error);
    }
}

// Función para sincronizar correos - MODIFICADA
function sincronizarCorreos() {
    console.log('Iniciando proceso de sincronización de correos...');
    try {
        // Guardar el mes seleccionado en localStorage antes de la redirección
        const mesSelector = document.getElementById('mes');
        if (!mesSelector) {
            console.error('Elemento selector de mes no encontrado');
            return;
        }
        
        const mesSeleccionado = mesSelector.value;
        localStorage.setItem('mesSeleccionado', mesSeleccionado);
        console.log('Mes seleccionado guardado en localStorage:', mesSeleccionado);
        
        // Mostrar modal de autenticación de Google
        const modal = document.getElementById('modal-google-auth');
        if (modal) {
            modal.style.display = 'block';
            console.log('Modal de autenticación mostrado');
        } else {
            console.error('Elemento modal-google-auth no encontrado');
        }

        // Iniciar el proceso de autenticación con Google
        console.log('Solicitando URL de autenticación...');
        fetch('/api/auth/url')
            .then(response => {
                console.log('Respuesta de API auth/url recibida:', response.status);
                return response.json();
            })
            .then(data => {
                console.log('URL de autenticación recibida:', data.auth_url ? (data.auth_url.substring(0, 50) + '...') : 'No URL');
                if (data.auth_url) {
                    // Redirigir a la URL de autenticación de Google
                    console.log('Redirigiendo a URL de autenticación de Google...');
                    window.location.href = data.auth_url;
                } else {
                    throw new Error('No se recibió URL de autenticación válida');
                }
            })
            .catch(error => {
                console.error('Error al obtener URL de autenticación:', error);
                alert('Error al conectar con el servidor. Por favor, intenta de nuevo más tarde.');
                cerrarModalAuth();
            });
    } catch (error) {
        console.error('Error en sincronizarCorreos:', error);
        alert('Error al iniciar sincronización. Por favor, intenta de nuevo.');
    }
}

// Función para sincronizar correos después de la autenticación - MODIFICADA
function sincronizarCorreosAutenticado(credentials) {
    console.log('Iniciando sincronizarCorreosAutenticado con credenciales:', typeof credentials, credentials ? Object.keys(credentials).join(', ') : 'null');
    try {
        // Mostrar indicador de carga
        const btnSincronizar = document.getElementById('sincronizar-correos-btn');
        if (btnSincronizar) {
            btnSincronizar.textContent = 'Sincronizando...';
            btnSincronizar.disabled = true;
            console.log('Botón de sincronización deshabilitado');
        } else {
            console.error('Elemento sincronizar-correos-btn no encontrado');
        }

        // Recuperar el mes seleccionado de localStorage
        const mesSeleccionado = localStorage.getItem('mesSeleccionado') || document.getElementById('mes').value;
        console.log('Mes recuperado para sincronización:', mesSeleccionado);
        
        // Actualizar el selector de mes para mostrar el valor correcto
        const mesSelector = document.getElementById('mes');
        if (mesSelector) {
            mesSelector.value = mesSeleccionado;
            console.log('Selector de mes actualizado a:', mesSeleccionado);
        } else {
            console.error('Elemento selector de mes no encontrado');
        }
        
        // Actualizar la variable global
        mesActual = mesSeleccionado;

        // Verificar que las credenciales sean válidas
        console.log('Verificando credenciales...');
        
        // Asegurarse de que credentials sea un objeto válido
        let credentialsObj = credentials;
        if (typeof credentials === 'string') {
            try {
                credentialsObj = JSON.parse(credentials.replace(/'/g, '"'));
                console.log('Credenciales parseadas desde string');
            } catch (e) {
                console.error('Error al parsear credenciales desde string:', e);
                credentialsObj = null;
            }
        }

        if (!credentialsObj || typeof credentialsObj !== 'object') {
            throw new Error('Credenciales inválidas');
        }

        // MODIFICACIÓN: Incluir el año en la sincronización
        // Llamar a la API para sincronizar correos
        console.log('Enviando solicitud de sincronización con mes:', mesSeleccionado, 'año:', añoActual);
        
        fetch('/api/sync/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                credentials: credentialsObj,
                mes: mesSeleccionado !== 'todos' ? mesSeleccionado : null,
                año: añoActual.toString() // Incluir el año actual
            })
        })
        .then(response => {
            console.log('Respuesta de API sync/emails recibida:', response.status);
            if (!response.ok) {
                console.error('Error en respuesta:', response.status, response.statusText);
            }
            return response.json();
        })
        .then(data => {
            console.log('Sincronización completada, respuesta:', data);
            
            // Actualizar la fecha de sincronización con la fecha real de la API
            if (data.fecha_sincronizacion) {
                // Usar la función de formateo para hora chilena
                const fechaFormateada = formatearFechaChilena(data.fecha_sincronizacion);
                const fechaSincElement = document.getElementById('fecha-sincronizacion');
                if (fechaSincElement) {
                    fechaSincElement.textContent = fechaFormateada;
                    console.log('Fecha de sincronización actualizada:', fechaFormateada);
                } else {
                    console.error('Elemento fecha-sincronizacion no encontrado');
                }
            }
            
            // Mostrar mensaje de resultado
            alert(data.mensaje || 'Sincronización completada');
            
            // Restaurar botón
            if (btnSincronizar) {
                btnSincronizar.textContent = 'Sincronizar Correos';
                btnSincronizar.disabled = false;
                console.log('Botón de sincronización restaurado');
            }
            
            // Recargar inquilinos para reflejar cambios
            console.log('Recargando inquilinos para reflejar cambios...');
            cargarInquilinos();
        })
        .catch(error => {
            console.error('Error en sincronización:', error);
            alert('Error en sincronización. Por favor, intenta de nuevo más tarde.');
            
            // Restaurar botón
            if (btnSincronizar) {
                btnSincronizar.textContent = 'Sincronizar Correos';
                btnSincronizar.disabled = false;
                console.log('Botón de sincronización restaurado después de error');
            }
        });
    } catch (error) {
        console.error('Error en sincronizarCorreosAutenticado:', error);
        alert('Error en sincronización. Por favor, intenta de nuevo.');
        
        // Restaurar botón
        const btnSincronizar = document.getElementById('sincronizar-correos-btn');
        if (btnSincronizar) {
            btnSincronizar.textContent = 'Sincronizar Correos';
            btnSincronizar.disabled = false;
        }
    }
}

// Cambiar mes - VERSIÓN MEJORADA
function cambiarMes() {
    try {
        const mesSelector = document.getElementById('mes');
        if (!mesSelector) {
            console.error('Elemento selector de mes no encontrado');
            return;
        }
        
        const mesSeleccionado = mesSelector.value;
        const mesAnterior = mesActual;
        mesActual = mesSeleccionado;
        
        console.log(`Cambiando mes de ${mesAnterior} a ${mesActual}`);
        
        // Limpiar completamente la tabla antes de volver a renderizarla
        const tbody = document.getElementById('inquilinos-body');
        if (tbody) {
            tbody.innerHTML = '';
        } else {
            console.error('Elemento inquilinos-body no encontrado');
        }
        
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
        mesSelector.blur();
        setTimeout(() => mesSelector.focus(), 100);
    } catch (error) {
        console.error('Error en cambiarMes:', error);
    }
}

// Mostrar modal para añadir inquilino
function mostrarModalAnadirInquilino() {
    console.log('Mostrando modal para añadir inquilino');
    try {
        // Limpiar formulario
        const formInquilino = document.getElementById('form-inquilino');
        if (formInquilino) {
            formInquilino.reset();
        } else {
            console.error('Elemento form-inquilino no encontrado');
        }
        
        editandoId = null;
        
        // Mostrar modal
        const modal = document.getElementById('modal-inquilino');
        if (modal) {
            modal.style.display = 'block';
            console.log('Modal de inquilino mostrado');
        } else {
            console.error('Elemento modal-inquilino no encontrado');
        }
    } catch (error) {
        console.error('Error en mostrarModalAnadirInquilino:', error);
    }
}

// Cerrar modal
function cerrarModal() {
    console.log('Cerrando modal de inquilino');
    try {
        const modal = document.getElementById('modal-inquilino');
        if (modal) {
            modal.style.display = 'none';
            console.log('Modal de inquilino cerrado');
        } else {
            console.error('Elemento modal-inquilino no encontrado');
        }
    } catch (error) {
        console.error('Error en cerrarModal:', error);
    }
}

// Cerrar modal de autenticación
function cerrarModalAuth() {
    console.log('Cerrando modal de autenticación');
    try {
        const modal = document.getElementById('modal-google-auth');
        if (modal) {
            modal.style.display = 'none';
            console.log('Modal de autenticación cerrado');
        } else {
            console.error('Elemento modal-google-auth no encontrado');
        }
    } catch (error) {
        console.error('Error en cerrarModalAuth:', error);
    }
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
            
            // Si no hay conexión con el backend, simular añadir inquilino (solo para demostración)
            const nuevoInquilino = {
                id: inquilinos.length + 1,
                propietario,
                propiedad,
                telefono,
                monto
            };
            
            inquilinos.push(nuevoInquilino);
            cerrarModal();
            cambiarMes(); // Esto actualizará la tabla
        });
    }
}

}

// Editar inquilino
function editarInquilino(id) {
    console.log(`Editando inquilino con ID: ${id}`);
    try {
        const inquilino = inquilinos.find(i => i.id === id);
        if (!inquilino) {
            console.error(`No se encontró inquilino con ID: ${id}`);
            return;
        }
        
        console.log('Datos del inquilino a editar:', inquilino);
        
        const nombreInput = document.getElementById('nombre');
        const propiedadInput = document.getElementById('propiedad');
        const telefonoInput = document.getElementById('telefono');
        const montoInput = document.getElementById('monto');
        
        if (!nombreInput || !propiedadInput || !telefonoInput || !montoInput) {
            console.error('Uno o más elementos del formulario no encontrados');
            return;
        }
        
        // Llenar formulario con datos del inquilino
        nombreInput.value = inquilino.propietario;
        propiedadInput.value = inquilino.propiedad;
        telefonoInput.value = inquilino.telefono;
        montoInput.value = inquilino.monto;
        
        // Guardar ID del inquilino que se está editando
        editandoId = id;
        
        // Mostrar modal
        const modal = document.getElementById('modal-inquilino');
        if (modal) {
            modal.style.display = 'block';
            console.log('Modal de inquilino mostrado para edición');
        } else {
            console.error('Elemento modal-inquilino no encontrado');
        }
    } catch (error) {
        console.error('Error en editarInquilino:', error);
    }
}

// Eliminar inquilino
function eliminarInquilino(id) {
    console.log(`Eliminando inquilino con ID: ${id}`);
    try {
        if (confirm('¿Estás seguro de que deseas eliminar este socio?')) {
            console.log('Confirmación de eliminación aceptada');
            fetch(`/api/inquilinos/${id}`, {
                method: 'DELETE'
            })
            .then(response => {
                console.log('Respuesta de API DELETE inquilinos recibida:', response.status);
                if (response.ok) {
                    console.log('Inquilino eliminado correctamente');
                    // Actualizar la lista de inquilinos
                    cargarInquilinos();
                } else {
                    throw new Error('Error al eliminar socio');
                }
            })
            .catch(error => {
                console.error('Error al eliminar socio:', error);
                alert('Error al eliminar socio. Por favor, intenta de nuevo.');
                
                // Si no hay conexión con el backend, simular eliminación (solo para demostración)
                console.log('Simulando eliminación como respaldo...');
                inquilinos = inquilinos.filter(i => i.id !== id);
                cambiarMes(); // Esto actualizará la tabla
            });
        } else {
            console.log('Eliminación cancelada por el usuario');
        }
    } catch (error) {
        console.error('Error en eliminarInquilino:', error);
    }
}

// Manejador global de errores
window.onerror = function(message, source, lineno, colno, error) {
    console.error('Error global capturado:', {message, source, lineno, colno, error});
    return false; // Permite que el error se propague
};
