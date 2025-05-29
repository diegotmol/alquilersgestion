// Variables globales
let inquilinos = [];
let editandoId = null;
let mesActual = null;
let añoActual = new Date().getFullYear(); // Año actual por defecto
let mesSeleccionadoAntesDeSincronizar = null; // Para recordar el mes seleccionado

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
    
    // Verificar si hay un mes guardado en localStorage
    const mesGuardado = localStorage.getItem('mesSeleccionado');
    if (mesGuardado) {
        mesActual = mesGuardado;
        document.getElementById('mes').value = mesGuardado;
    }

    // Verificar si hay credenciales en la URL (después de la autenticación de Google)
    const urlParams = new URLSearchParams(window.location.search);
    const credentials = urlParams.get('credentials');
    if (credentials) {
        // Limpiar la URL
        window.history.replaceState({}, document.title, window.location.pathname);

        // Restaurar el mes seleccionado antes de la sincronización
        const mesGuardado = localStorage.getItem('mesSeleccionado');
        if (mesGuardado) {
            mesActual = mesGuardado;
            document.getElementById('mes').value = mesGuardado;
        }

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
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
}

// Cargar inquilinos desde la API
function cargarInquilinos() {
    // Añadir timestamp para evitar caché
    const timestamp = new Date().getTime();
    
    // Mostrar indicador de carga pero mantener la tabla visible
    const tbody = document.getElementById('inquilinos-body');
    if (tbody && tbody.innerHTML === '') {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Cargando datos...</td></tr>';
    }
    
    fetch(`/api/inquilinos/?t=${timestamp}`)
        .then(response => response.json())
        .then(data => {
            inquilinos = data;
            renderizarTablaInquilinos();
            calcularTotales();
        })
        .catch(error => {
            console.error('Error al cargar socios:', error);
            // Si hay error, mostrar mensaje en la tabla
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Error al cargar datos. Intente nuevamente.</td></tr>';
            }
            // Si no hay conexión con el backend, usar datos de ejemplo para demostración
            cargarDatosEjemplo();
        });
}

// Cargar datos de ejemplo (solo para demostración si no hay backend)
function cargarDatosEjemplo() {
    inquilinos = [
        { id: 1, propietario: 'Juan Pérez', propiedad: 'Socio #001', telefono: '+56 9 12345678', monto: 800 },
        { id: 2, propietario: 'Maria Gómez', propiedad: 'Socio #002', telefono: '+56 9 98765432', monto: 650 },
        { id: 3, propietario: 'Carlos López', propiedad: 'Socio #003', telefono: '+56 9 55555555', monto: 1200 },
        { id: 4, propietario: 'Ana Rodríguez', propiedad: 'Socio #004', telefono: '+56 9 87654321', monto: 750 },
        { id: 5, propietario: 'Luis Martínez', propiedad: 'Socio #005', telefono: '+56 9 11112222', monto: 900 }
    ];
    renderizarTablaInquilinos();
    calcularTotales();
}

// Renderizar tabla de inquilinos con logs detallados
function renderizarTablaInquilinos() {
    const tbody = document.getElementById('inquilinos-body');
    if (!tbody) {
        console.error('No se encontró el elemento tbody');
        return;
    }
    
    tbody.innerHTML = '';

    inquilinos.forEach(inquilino => {
        const tr = document.createElement('tr');
        
        // Determinar el estado de pago según el mes seleccionado
        let estadoPago = 'No pagado'; // Valor por defecto
        
        // Asegurar que el mes tenga dos dígitos
        const mesDosDigitos = mesActual.toString().padStart(2, '0');
        const campoMesAño = `pago_${mesDosDigitos}_${añoActual}`;
        
        // LOGS DETALLADOS PARA LA COMPARACIÓN
        if (inquilino.propietario === 'Diego Alfredo Tapia') {
            console.log(`--- COMPARACIÓN PARA DIEGO ALFREDO TAPIA ---`);
            console.log(`Mes actual: ${mesActual}, formateado: ${mesDosDigitos}`);
            console.log(`Año actual: ${añoActual}`);
            console.log(`Campo a verificar: ${campoMesAño}`);
            console.log(`¿El campo existe en el objeto?: ${campoMesAño in inquilino}`);
            console.log(`Valor del campo: "${inquilino[campoMesAño]}"`);
            console.log(`Tipo de dato: ${typeof inquilino[campoMesAño]}`);
            console.log(`Comparación estricta con 'Pagado': ${inquilino[campoMesAño] === 'Pagado'}`);
            console.log(`Comparación flexible: ${inquilino[campoMesAño] && inquilino[campoMesAño].toString().trim().toLowerCase() === 'pagado'}`);
            console.log(`Objeto inquilino completo:`, inquilino);
        }
        
        // Verificar si el campo existe y tiene el valor "Pagado"
        if (inquilino[campoMesAño] === 'Pagado') {
            estadoPago = 'Pagado';
            // Log adicional cuando se marca como pagado
            if (inquilino.propietario === 'Diego Alfredo Tapia') {
                console.log(`✅ MARCADO COMO PAGADO`);
            }
        } else {
            // Log cuando NO se marca como pagado
            if (inquilino.propietario === 'Diego Alfredo Tapia') {
                console.log(`❌ NO MARCADO COMO PAGADO`);
            }
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

    inquilinos.forEach(inquilino => {
        const monto = parseFloat(inquilino.monto);
        totalMonto += monto;
        
        // Determinar si está pagado según el mes y año seleccionados
        let pagado = false;
        
        // Asegurar que el mes tenga dos dígitos
        const mesDosDigitos = mesActual.toString().padStart(2, '0');
        const campoMesAño = `pago_${mesDosDigitos}_${añoActual}`;
        
        // Verificar si el campo existe y tiene el valor "Pagado"
        if (inquilino[campoMesAño] === 'Pagado') {
            pagado = true;
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
}

// Función para sincronizar correos
function sincronizarCorreos() {
    // Guardar el mes seleccionado antes de sincronizar
    mesSeleccionadoAntesDeSincronizar = document.getElementById('mes').value;
    localStorage.setItem('mesSeleccionado', mesSeleccionadoAntesDeSincronizar);
    
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

    // Recuperar el mes seleccionado antes de sincronizar
    const mesSeleccionado = localStorage.getItem('mesSeleccionado') || document.getElementById('mes').value;
    mesActual = mesSeleccionado;
    document.getElementById('mes').value = mesSeleccionado;

    // Mantener la tabla visible durante la sincronización
    const tbody = document.getElementById('inquilinos-body');
    if (tbody) {
        // Añadir indicador de carga pero mantener la tabla
        const filasCargando = Array.from(tbody.querySelectorAll('tr')).map(() => 
            '<tr><td colspan="6" style="text-align: center; opacity: 0.5;">Sincronizando...</td></tr>'
        ).join('');
        
        if (filasCargando) {
            tbody.innerHTML = filasCargando;
        } else {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Sincronizando...</td></tr>';
        }
    }

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
        
        // Recargar inmediatamente los datos actualizados
        const timestamp = new Date().getTime();
        fetch(`/api/inquilinos/?t=${timestamp}`)
            .then(response => response.json())
            .then(data => {
                inquilinos = data;
                
                // Asegurar que el mes seleccionado se mantenga
                mesActual = mesSeleccionado;
                document.getElementById('mes').value = mesSeleccionado;
                
                // Renderizar la tabla con los datos actualizados
                renderizarTablaInquilinos();
                calcularTotales();
            })
            .catch(error => {
                console.error('Error al recargar datos después de sincronización:', error);
                
                // En caso de error, intentar renderizar con los datos existentes
                renderizarTablaInquilinos();
                calcularTotales();
            });
    })
    .catch(error => {
        console.error('Error en sincronización:', error);
        alert('Error en sincronización. Por favor, intenta de nuevo más tarde.');
        
        // Restaurar botón
        document.getElementById('sincronizar-correos-btn').textContent = 'Sincronizar Correos';
        document.getElementById('sincronizar-correos-btn').disabled = false;
        
        // Recargar la tabla en caso de error
        cargarInquilinos();
    });
}

// Función para cambiar el mes seleccionado
function cambiarMes() {
    const mesSeleccionado = document.getElementById('mes').value;
    const mesAnterior = mesActual;
    
    // Extraer mes y año del valor seleccionado
    let mesExtraido = mesSeleccionado;
    let añoExtraido = null;
    
    // Detectar diferentes formatos
    if (mesSeleccionado.includes('-')) {
        // Formato "MM-YYYY"
        const partes = mesSeleccionado.split('-');
        if (partes.length === 2) {
            mesExtraido = partes[0];
            añoExtraido = parseInt(partes[1]);
        }
    } else if (/\d{4}$/.test(mesSeleccionado)) {
        // Formato "Mes YYYY" (ej: "Enero 2025")
        const añoMatch = mesSeleccionado.match(/\d{4}$/);
        if (añoMatch) {
            añoExtraido = parseInt(añoMatch[0]);
            // Extraer solo el mes (todo excepto el año y espacios al final)
            mesExtraido = mesSeleccionado.replace(/\s*\d{4}$/, '');
            
            // Convertir nombre de mes a número si es necesario
            const mesesNombres = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                                 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
            
            const indice = mesesNombres.findIndex(m => m.toLowerCase() === mesExtraido.toLowerCase());
            if (indice !== -1) {
                mesExtraido = (indice + 1).toString();
            }
        }
    }
    
    // Actualizar variables globales
    mesActual = mesExtraido;
    if (añoExtraido !== null) {
        añoActual = añoExtraido;
    }
    
    // Log para depuración
    console.log(`Mes cambiado a: ${mesActual}, Año: ${añoActual}`);
    
    // Guardar el mes seleccionado en localStorage (mantener comportamiento original)
    localStorage.setItem('mesSeleccionado', mesSeleccionado);
    
    // Mantener la tabla visible durante la carga
    const tbody = document.getElementById('inquilinos-body');
    if (tbody) {
        // Añadir indicador de carga pero mantener la estructura de la tabla
        const filasCargando = Array.from(tbody.querySelectorAll('tr')).map(() => 
            '<tr><td colspan="6" style="text-align: center; opacity: 0.5;">Actualizando...</td></tr>'
        ).join('');
        
        if (filasCargando) {
            tbody.innerHTML = filasCargando;
        } else {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Actualizando...</td></tr>';
        }
    }
    
    // Añadir timestamp para evitar caché
    const timestamp = new Date().getTime();
    
    fetch(`/api/inquilinos/?t=${timestamp}`)
        .then(response => response.json())
        .then(data => {
            inquilinos = data;
            
            // Renderizar la tabla con los datos actualizados
            renderizarTablaInquilinos();
            calcularTotales();
        })
        .catch(error => {
            console.error('Error al cambiar mes:', error);
            alert('Error al cargar datos. Por favor, intente nuevamente.');
            
            // Restaurar mes anterior en caso de error
            mesActual = mesAnterior;
            document.getElementById('mes').value = mesAnterior;
            
            // Intentar renderizar con los datos existentes
            renderizarTablaInquilinos();
            calcularTotales();
        });
}

    
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
