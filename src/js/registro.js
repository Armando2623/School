async function registerVisit(event) {
    event.preventDefault(); // Evita que la página se recargue

    // Obtener la fecha y hora por separado para unirlas en LocalDateTime
    const fechaInput = document.getElementById("visitDate").value;    // Ej: "2026-03-09"
    const horaInput = document.getElementById("visitTime").value;     // Ej: "14:30"
    const fechaHoraIngreso = `${fechaInput}T${horaInput}:00`;         // "2026-03-09T14:30:00"

    // 1. Recolectar datos del formulario mapeando EXACTAMENTE a tu DTO de Java
    const visitData = {
        dniVisitante: document.getElementById("documentNumber").value.trim(),
        nombreVisitante: document.getElementById("visitorName").value.trim(),
        motivo: document.getElementById("visitReason").value,
        horaIngreso: fechaHoraIngreso,

        // Asumiendo que guardaremos el id del usuario en un campo oculto al seleccionar "Persona a Visitar"
        // Convertimos a número porque el DTO espera un envoltorio Long
        usuario_id: parseInt(document.getElementById("usuarioId").value, 10),

        estadoRegistro: "REGISTRADO"
    };

    try {
        // 2. Enviar datos al backend mediante fetch (POST)
        const response = await fetch("http://localhost:8080/api/visitas", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(visitData)
        });

        if (!response.ok) {
            throw new Error(`Error en el servidor: ${response.status}`);
        }

        const data = await response.json();
        console.log("Visita registrada exitosamente:", data);

        // 3. Mostrar mensaje de éxito (puedes usar showToast de app.js si está disponible globalmente)
        if (typeof showToast === 'function') {
            showToast("Visita registrada correctamente", "success");
        } else {
            alert("Visita registrada correctamente");
        }

        // 4. Limpiar formulario
        resetForm();

        // 5. Redirigir al dashboard y actualizar tabla
        if (typeof navigateTo === 'function') {
            navigateTo("dashboard");
        }

    } catch (error) {
        console.error("Error al registrar la visita:", error);

        if (typeof showToast === 'function') {
            showToast("Error al conectar con el servidor", "error");
        } else {
            alert("Error al conectar con el servidor backend");
        }
    }
}

function resetForm() {
    const form = document.getElementById("registerForm");
    if (form) form.reset();
}

// Inicializar autocompletado para "Persona a Visitar" (usuario_id) en vista registro
function setupRegistroAutocomplete() {
    const inputUsuario = document.getElementById("personVisited");
    const suggestionsBox = document.getElementById("suggestions");
    const usuarioIdInput = document.getElementById("usuarioId");

    if (!inputUsuario || !suggestionsBox || !usuarioIdInput) return;

    inputUsuario.addEventListener("input", async function () {
        const texto = inputUsuario.value.trim();

        if (texto.length < 2) {
            suggestionsBox.innerHTML = "";
            return;
        }

        try {
            const response = await fetch(
                `http://localhost:8080/api/visitas/usuarios?search=${texto}`
            );

            if (!response.ok) throw new Error("Error en la búsqueda");

            const usuarios = await response.json();
            suggestionsBox.innerHTML = "";

            if (usuarios.length === 0) {
                const div = document.createElement("div");
                div.classList.add("suggestion-item");
                div.textContent = "No se encontraron usuarios";
                suggestionsBox.appendChild(div);
                return;
            }

            usuarios.forEach(usuario => {
                const div = document.createElement("div");
                div.classList.add("suggestion-item");
                div.textContent = usuario.nombre; // Ajustar si el API devuelve nombreVisitante o userName

                div.onclick = () => {
                    inputUsuario.value = usuario.nombre;
                    usuarioIdInput.value = usuario.id;
                    suggestionsBox.innerHTML = "";
                };

                suggestionsBox.appendChild(div);
            });

        } catch (error) {
            console.error("Error buscando usuarios:", error);
        }
    });

    // Cerrar sugerencias al hacer clic fuera
    document.addEventListener("click", function (e) {
        if (e.target !== inputUsuario && e.target !== suggestionsBox) {
            suggestionsBox.innerHTML = "";
        }
    });
}

// Ejecutar cuando se carga el módulo de registro
setupRegistroAutocomplete();

function loadVisitorForEditing() {
    const editId = sessionStorage.getItem('editVisitorId');
    if (!editId) return; // No hay visitante para editar (es un registro nuevo)

    // Necesitamos el array global 'visitors' de app.js
    if (typeof visitors !== 'undefined') {
        const visitor = visitors.find(v => String(v.id) === String(editId));

        if (visitor) {
            // Llenar formulario (soporta nombres del API y de los datos de ejemplo)
            document.getElementById('visitorName').value = visitor.nombreVisitante || visitor.nombre || visitor.name || '';
            document.getElementById('documentType').value = visitor.documentType || 'DNI';
            document.getElementById('documentNumber').value = visitor.dniVisitante || visitor.documento || visitor.document || '';
            document.getElementById('visitDate').value = visitor.fecha || visitor.date || '';
            document.getElementById('visitTime').value = visitor.horaIngreso || visitor.hora_entrada || visitor.timeIn || '';
            document.getElementById('visitReason').value = visitor.motivo || visitor.reason || '';
            document.getElementById('personVisited').value = (visitor.usuario ? visitor.usuario.nombre : visitor.persona_visitada) || visitor.person || '';

            // Asignamos el ID del usuario al hidden input
            if (visitor.usuario_id || visitor.usuario?.id) {
                document.getElementById('usuarioId').value = visitor.usuario_id || visitor.usuario?.id;
            }

            document.getElementById('department').value = visitor.department || '';
            document.getElementById('vehiclePlate').value = visitor.vehiclePlate || '';
            document.getElementById('additionalNotes').value = visitor.notes || '';

            // Cambiar texto del botón a "Actualizar"
            const btnSubmit = document.querySelector('.btn-submit');
            if (btnSubmit) {
                btnSubmit.innerHTML = '<i class="fas fa-save"></i> Actualizar Visita';
            }
        }
    }

    // Limpiar el ID tras cargarlo para no afectar a futuros "Nuevos Registros"
    sessionStorage.removeItem('editVisitorId');
}

// Ejecutar hidratación del formulario de edición si aplica
setTimeout(loadVisitorForEditing, 50);