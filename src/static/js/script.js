// Variables globales
let inquilinos = [];
let mesActual = '01'; // Mes actual en formato MM
let añoActual = new Date().getFullYear(); // Año actual

// Función para cargar los datos de los inquilinos desde la API
function cargarInquilinos() {
    return new Promise((resolve, reject) => {
        fetch('/api/inquilinos/')
            .then(response => response.json())
            .then(data => {
                inquilinos = data;
                renderizarTablaInquilinos();
                calcularTotales();
                resolve(); // Resolver la promesa cuando se completa la carga
            })
            .catch(error => {
                console.error('Error al cargar socios:', error);
                // Si no hay conexión con el backend, usar datos de ejemplo para demostración
                cargarDatosEjemplo();
                resolve(); // Resolver la promesa incluso en caso de error
            });
    });
}

// Función para cargar datos de ejemplo (solo para demostración)
function cargarDatosEjemplo() {
    inquilinos = [
        {
            id: 1,
            propietario: "Diego Alfredo Tapia",
            numero_socio: "122124545",
            telefono: "963978767",
            monto: 36000,
            [`pago_${mesActual}_${añoActual}`]: "No pagado"
        }
    ];
    renderizarTablaInquilinos();
    calcularTotales();
}

// Función para renderizar la tabla de inquilinos
function renderizarTablaInquilinos() {
    const tabla = document.querySelector('table');
    if (!tabla) {
        console.error('No se encontró la tabla en el DOM');
        return;
    }
    
    const tbody = tabla.querySelector('tbody') || document.createElement('tbody');
    
    // Limpiar el contenido actual
    tbody.innerHTML = '';
    
    // Añadir filas para cada inquilino
    inquilinos.forEach(inquilino => {
        const fila = document.createElement('tr');
        
        // Columna: Nombre del Socio
        const colNombre = document.createElement('td');
        colNombre.textContent = inquilino.propietario;
        colNombre.style.color = 'red'; // Estilo para destacar
        fila.appendChild(colNombre);
        
        // Columna: Número de Socio
        const colNumero = document.createElement('td');
        colNumero.textContent = inquilino.numero_socio;
        fila.appendChild(colNumero);
        
        // Columna: Número de Teléfono
        const colTelefono = document.createElement('td');
        colTelefono.textContent = inquilino.telefono;
        fila.appendChild(colTelefono);
        
        // Columna: Monto a Pagar
        const colMonto = document.createElement('td');
        colMonto.textContent = `$${inquilino.monto}`;
        fila.appendChild(colMonto);
        
        // Columna: Estado de pago
        const colEstado = document.createElement('td');
        const estadoPago = inquilino[`pago_${mesActual}_${añoActual}`] || "No pagado";
        colEstado.textContent = estadoPago;
        colEstado.style.color = estadoPago === "Pagado" ? 'green' : 'red';
        fila.appendChild(colEstado);
        
        // Columna: Acciones
        const colAcciones = document.createElement('td');
        
        // Botón Eliminar
        const btnEliminar = document.createElement('button');
        btnEliminar.textContent = 'Eliminar';
        btnEliminar.className = 'btn-eliminar';
        btnEliminar.onclick = function() { eliminarInquilino(inquilino.id); };
        btnEliminar.style.backgroundColor = '#dc3545';
        btnEliminar.style.color = 'white';
        btnEliminar.style.border = 'none';
        btnEliminar.style.padding = '5px 10px';
        btnEliminar.style.borderRadius = '3px';
        btnEliminar.style.marginRight = '5px';
        colAcciones.appendChild(btnEliminar);
        
        // Botón Editar
        const btnEditar = document.createElement('button');
        btnEditar.textContent = 'Editar';
        btnEditar.className = 'btn-editar';
        btnEditar.onclick = function() { editarInquilino(inquilino.id); };
        btnEditar.style.backgroundColor = '#007bff';
        btnEditar.style.color = 'white';
        btnEditar.style.border = 'none';
        btnEditar.style.padding = '5px 10px';
        btnEditar.style.borderRadius = '3px';
        colAcciones.appendChild(btnEditar);
        
        fila.appendChild(colAcciones);
        
        tbody.appendChild(fila);
    });
    
    // Asegurarse de que el tbody esté en la tabla
    if (!tabla.contains(tbody)) {
        tabla.appendChild(tbody);
    }
}

// Función para calcular los totales
function calcularTotales() {
    try {
        let totalMonto = 0;
        let totalPagado = 0;
        let totalNoPagado = 0;
        
        inquilinos.forEach(inquilino => {
            const monto = inquilino.monto || 0;
            totalMonto += monto;
            
            const estadoPago = inquilino[`pago_${mesActual}_${añoActual}`] || "No pagado";
            if (estadoPago === "Pagado") {
                totalPagado += monto;
            } else {
                totalNoPagado += monto;
            }
        });
        
        // Actualizar los elementos en el DOM
        const totalMontoEl = document.getElementById('total-monto');
        const totalPagadoEl = document.getElementById('total-pagado');
        const totalNoPagadoEl = document.getElementById('total-no-pagado');
        
        if (totalMontoEl) totalMontoEl.textContent = `$${totalMonto}`;
        if (totalPagadoEl) totalPagadoEl.textContent = `$${totalPagado}`;
        if (totalNoPagadoEl) totalNoPagadoEl.textContent = `$${totalNoPagado}`;
    } catch (error) {
        console.error('Error al calcular totales:', error);
    }
}

// Función para cambiar el mes seleccionado
function cambiarMes() {
    try {
        const selectMes = document.getElementById('mes');
        if (selectMes) {
            mesActual = selectMes.value;
            
            // Actualizar la tabla con el nuevo mes
            renderizarTablaInquilinos();
            calcularTotales();
        }
    } catch (error) {
        console.error('Error al cambiar mes:', error);
    }
}

// Función para sincronizar correos
function sincronizarCorreos() {
    try {
        // Guardar el mes seleccionado en localStorage antes de la redirección
        const mesSeleccionado = document.getElementById('mes').value;
        localStorage.setItem('mesSeleccionado', mesSeleccionado);
        
        // Mostrar modal de autenticación de Google
        const modal = document.getElementById('modal-google-auth');
        if (modal) {
            modal.style.display = 'block';
        }

        // Iniciar el proceso de autenticación con Google
        fetch('/api/auth/url')
            .then(response => response.json())
            .then(data => {
                if (data.auth_url) {
                    // Redirigir a la URL de autenticación de Google
                    window.location.href = data.auth_url;
                } else {
                    alert('Error al obtener URL de autenticación');
                    if (modal) modal.style.display = 'none';
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error al iniciar autenticación');
                if (modal) modal.style.display = 'none';
            });
    } catch (error) {
        console.error('Error al sincronizar correos:', error);
        alert('Error al iniciar sincronización. Por favor, intenta de nuevo.');
    }
}

// Función para procesar la autenticación y sincronizar correos
function sincronizarCorreosAutenticado(credentials) {
    try {
        // Mostrar indicador de carga
        const btnSincronizar = document.getElementById('sincronizar-correos-btn');
        if (btnSincronizar) {
            btnSincronizar.textContent = 'Sincronizando...';
            btnSincronizar.disabled = true;
        }

        // AÑADIR: Asegurarse de que la tabla esté cargada antes de sincronizar
        cargarInquilinos().then(() => {
            // Recuperar el mes seleccionado de localStorage
            const mesSeleccionado = localStorage.getItem('mesSeleccionado') || 
                                   (document.getElementById('mes') ? document.getElementById('mes').value : '01');
            
            // Actualizar el selector de mes para mostrar el valor correcto
            const selectMes = document.getElementById('mes');
            if (selectMes) {
                selectMes.value = mesSeleccionado;
            }
            
            // Actualizar la variable global
            mesActual = mesSeleccionado;

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
                    const fechaSincEl = document.getElementById('fecha-sincronizacion');
                    if (fechaSincEl) {
                        fechaSincEl.textContent = fechaFormateada;
                    }
                }
                
                // Mostrar mensaje de resultado
                alert(data.mensaje || 'Sincronización completada');
                
                // Restaurar botón
                if (btnSincronizar) {
                    btnSincronizar.textContent = 'Sincronizar Correos';
                    btnSincronizar.disabled = false;
                }
                
                // Recargar inquilinos para reflejar cambios
                cargarInquilinos();
            })
            .catch(error => {
                console.error('Error en sincronización:', error);
                alert('Error en sincronización. Por favor, intenta de nuevo más tarde.');
                
                // Restaurar botón
                if (btnSincronizar) {
                    btnSincronizar.textContent = 'Sincronizar Correos';
                    btnSincronizar.disabled = false;
                }
            });
        });
    } catch (error) {
        console.error('Error en sincronizarCorreosAutenticado:', error);
        alert('Error al procesar autenticación. Por favor, intenta de nuevo.');
        
        // Restaurar botón en caso de error
        const btnSincronizar = document.getElementById('sincronizar-correos-btn');
        if (btnSincronizar) {
            btnSincronizar.textContent = 'Sincronizar Correos';
            btnSincronizar.disabled = false;
        }
    }
}

// Función para formatear fecha en formato chileno
function formatearFechaChilena(fechaISO) {
    try {
        const fecha = new Date(fechaISO);
        // Ajustar a zona horaria de Chile (UTC-4 o UTC-3 según horario de verano)
        const fechaChile = new Date(fecha.getTime() - (4 * 60 * 60 * 1000)); // UTC-4
        
        const dia = fechaChile.getDate();
        const mes = fechaChile.getMonth() + 1;
        const año = fechaChile.getFullYear();
        const hora = fechaChile.getHours();
        const minutos = fechaChile.getMinutes();
        
        return `${dia} de ${obtenerNombreMes(mes)} de ${año}, ${hora}:${minutos < 10 ? '0' + minutos : minutos}`;
    } catch (error) {
        console.error('Error al formatear fecha:', error);
        return fechaISO; // Devolver la fecha original en caso de error
    }
}

// Función para obtener el nombre del mes
function obtenerNombreMes(mes) {
    const meses = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    return meses[mes - 1] || '';
}

// Función para agregar un nuevo inquilino
function agregarInquilino() {
    try {
        const nombreEl = document.getElementById('nuevo-nombre');
        const numeroEl = document.getElementById('nuevo-numero');
        const telefonoEl = document.getElementById('nuevo-telefono');
        const montoEl = document.getElementById('nuevo-monto');
        
        if (!nombreEl || !numeroEl || !telefonoEl || !montoEl) {
            console.error('No se encontraron los elementos del formulario');
            return;
        }
        
        const nombre = nombreEl.value;
        const numero = numeroEl.value;
        const telefono = telefonoEl.value;
        const monto = parseInt(montoEl.value);
        
        if (!nombre || !numero || !telefono || isNaN(monto)) {
            alert('Por favor, completa todos los campos correctamente');
            return;
        }
        
        // Crear objeto con los datos del nuevo inquilino
        const nuevoInquilino = {
            propietario: nombre,
            numero_socio: numero,
            telefono: telefono,
            monto: monto
        };
        
        // Enviar datos al backend
        fetch('/api/inquilinos/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(nuevoInquilino)
        })
        .then(response => response.json())
        .then(data => {
            console.log('Inquilino agregado:', data);
            
            // Limpiar formulario
            nombreEl.value = '';
            numeroEl.value = '';
            telefonoEl.value = '';
            montoEl.value = '';
            
            // Cerrar modal
            const modal = document.getElementById('modal-agregar');
            if (modal) modal.style.display = 'none';
            
            // Recargar inquilinos
            cargarInquilinos();
        })
        .catch(error => {
            console.error('Error al agregar inquilino:', error);
            alert('Error al agregar inquilino. Por favor, intenta de nuevo.');
        });
    } catch (error) {
        console.error('Error en agregarInquilino:', error);
        alert('Error al agregar socio. Por favor, intenta de nuevo.');
    }
}

// Función para eliminar un inquilino
function eliminarInquilino(id) {
    try {
        if (!confirm('¿Estás seguro de que deseas eliminar este socio?')) {
            return;
        }
        
        console.log('Eliminando inquilino con ID:', id);
        
        // Enviar solicitud de eliminación al backend
        fetch(`/api/inquilinos/${id}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (response.ok) {
                console.log('Inquilino eliminado');
                
                // Actualizar lista de inquilinos
                cargarInquilinos();
            } else {
                throw new Error('Error al eliminar inquilino');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error al eliminar socio. Por favor, intenta de nuevo.');
            
            // Si no hay conexión con el backend, simular eliminación (solo para demostración)
            inquilinos = inquilinos.filter(i => i.id !== id);
            renderizarTablaInquilinos();
            calcularTotales();
        });
    } catch (error) {
        console.error('Error en eliminarInquilino:', error);
        alert('Error al eliminar socio. Por favor, intenta de nuevo.');
    }
}

// Función para editar un inquilino
function editarInquilino(id) {
    try {
        console.log('Editando inquilino con ID:', id);
        
        // Buscar el inquilino por ID
        const inquilino = inquilinos.find(i => i.id === id);
        if (!inquilino) {
            alert('Socio no encontrado');
            return;
        }
        
        // Abrir modal de edición
        const modal = document.getElementById('modal-editar');
        if (!modal) {
            console.error('No se encontró el modal de edición');
            return;
        }
        
        modal.style.display = 'block';
        
        // Llenar formulario con datos actuales
        const idEl = document.getElementById('editar-id');
        const nombreEl = document.getElementById('editar-nombre');
        const numeroEl = document.getElementById('editar-numero');
        const telefonoEl = document.getElementById('editar-telefono');
        const montoEl = document.getElementById('editar-monto');
        
        if (idEl) idEl.value = inquilino.id;
        if (nombreEl) nombreEl.value = inquilino.propietario;
        if (numeroEl) numeroEl.value = inquilino.numero_socio;
        if (telefonoEl) telefonoEl.value = inquilino.telefono;
        if (montoEl) montoEl.value = inquilino.monto;
    } catch (error) {
        console.error('Error en editarInquilino:', error);
        alert('Error al editar socio. Por favor, intenta de nuevo.');
    }
}

// Función para guardar cambios de un inquilino editado
function guardarEdicion() {
    try {
        const idEl = document.getElementById('editar-id');
        const nombreEl = document.getElementById('editar-nombre');
        const numeroEl = document.getElementById('editar-numero');
        const telefonoEl = document.getElementById('editar-telefono');
        const montoEl = document.getElementById('editar-monto');
        
        if (!idEl || !nombreEl || !numeroEl || !telefonoEl || !montoEl) {
            console.error('No se encontraron los elementos del formulario de edición');
            return;
        }
        
        const id = idEl.value;
        const nombre = nombreEl.value;
        const numero = numeroEl.value;
        const telefono = telefonoEl.value;
        const monto = parseInt(montoEl.value);
        
        if (!nombre || !numero || !telefono || isNaN(monto)) {
            alert('Por favor, completa todos los campos correctamente');
            return;
        }
        
        // Crear objeto con los datos actualizados
        const inquilinoActualizado = {
            id: id,
            propietario: nombre,
            numero_socio: numero,
            telefono: telefono,
            monto: monto
        };
        
        console.log('Guardando cambios para inquilino:', inquilinoActualizado);
        
        // Enviar datos actualizados al backend
        fetch(`/api/inquilinos/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(inquilinoActualizado)
        })
        .then(response => response.json())
        .then(data => {
            console.log('Inquilino actualizado:', data);
            
            // Cerrar modal
            const modal = document.getElementById('modal-editar');
            if (modal) modal.style.display = 'none';
            
            // Recargar inquilinos
            cargarInquilinos();
        })
        .catch(error => {
            console.error('Error al actualizar inquilino:', error);
            alert('Error al actualizar socio. Por favor, intenta de nuevo.');
            
            // Si no hay conexión con el backend, simular actualización (solo para demostración)
            const index = inquilinos.findIndex(i => i.id === parseInt(id));
            if (index !== -1) {
                inquilinos[index] = inquilinoActualizado;
                renderizarTablaInquilinos();
                calcularTotales();
            }
        });
    } catch (error) {
        console.error('Error en guardarEdicion:', error);
        alert('Error al guardar cambios. Por favor, intenta de nuevo.');
    }
}

// Función para abrir el modal de agregar inquilino
function abrirModalAgregar() {
    try {
        const modal = document.getElementById('modal-agregar');
        if (modal) modal.style.display = 'block';
    } catch (error) {
        console.error('Error al abrir modal:', error);
    }
}

// Función para cerrar modales
function cerrarModal(modalId) {
    try {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'none';
    } catch (error) {
        console.error('Error al cerrar modal:', error);
    }
}

// Función para configurar los eventos de los botones
function configurarEventosBotones() {
    try {
        // Configurar evento para botón de sincronización
        const btnSincronizar = document.getElementById('sincronizar-correos-btn');
        if (btnSincronizar) {
            console.log('Configurando evento para botón de sincronización');
            btnSincronizar.addEventListener('click', sincronizarCorreos);
        }
        
        // Configurar evento para botón de agregar
        const btnAgregar = document.getElementById('agregar-inquilino-btn');
        if (btnAgregar) {
            console.log('Configurando evento para botón de agregar');
            btnAgregar.addEventListener('click', abrirModalAgregar);
        }
        
        // Configurar evento para botón de guardar en modal de agregar
        const btnGuardarAgregar = document.getElementById('guardar-nuevo-btn');
        if (btnGuardarAgregar) {
            console.log('Configurando evento para botón de guardar nuevo');
            btnGuardarAgregar.addEventListener('click', agregarInquilino);
        }
        
        // Configurar evento para botón de guardar en modal de editar
        const btnGuardarEditar = document.getElementById('guardar-edicion-btn');
        if (btnGuardarEditar) {
            console.log('Configurando evento para botón de guardar edición');
            btnGuardarEditar.addEventListener('click', guardarEdicion);
        }
        
        // Configurar eventos para botones de cerrar modales
        const btnsCloseModal = document.querySelectorAll('.close-modal');
        btnsCloseModal.forEach(btn => {
            const modalId = btn.getAttribute('data-modal');
            if (modalId) {
                console.log('Configurando evento para botón de cerrar modal:', modalId);
                btn.addEventListener('click', () => cerrarModal(modalId));
            }
        });
    } catch (error) {
        console.error('Error al configurar eventos de botones:', error);
    }
}

// Inicializar la aplicación cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', function() {
    try {
        console.log('DOM cargado, inicializando aplicación...');
        
        // Cargar inquilinos al iniciar
        cargarInquilinos();
        
        // Configurar evento para cambio de mes
        const selectMes = document.getElementById('mes');
        if (selectMes) {
            console.log('Configurando evento para selector de mes');
            selectMes.addEventListener('change', cambiarMes);
        }
        
        // Configurar eventos para botones
        configurarEventosBotones();
        
        // Verificar si hay credenciales en la URL (callback de OAuth)
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (code) {
            console.log('Código de autorización detectado, procesando...');
            // Procesar el código de autorización
            fetch('/api/auth/callback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code: code })
            })
            .then(response => response.json())
            .then(data => {
                if (data.credentials) {
                    // Sincronizar correos con las credenciales obtenidas
                    sincronizarCorreosAutenticado(data.credentials);
                } else {
                    alert('Error en autenticación');
                }
            })
            .catch(error => {
                console.error('Error en callback:', error);
                alert('Error en autenticación. Por favor, intenta de nuevo.');
            });
        }
    } catch (error) {
        console.error('Error al inicializar aplicación:', error);
        alert('Error al cargar la aplicación. Por favor, recarga la página.');
    }
});

// Agregar un manejador de errores global
window.onerror = function(mensaje, archivo, linea, columna, error) {
    console.error('Error global:', mensaje, 'en', archivo, 'línea', linea, 'columna', columna);
    console.error('Detalles del error:', error);
    return false; // Permitir que el error se propague
};
