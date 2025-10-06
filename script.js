// script.js - Control de Parqueo (actualizado y corregido)
// =============================
// VARIABLES GLOBALES (localStorage)
// =============================
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyMnXt1GjbnlxkwpltV-22iuEp1rSrS1-qyPsMzPcLnRgBOAKZEHW44Xhe24-icIvsc0w/exec";

// Lista de usuarios predeterminados
const USUARIOS_DEFAULT = [
    // admin por defecto con todos los permisos
    {
        user: "admin01",
        pass: "Fernandez01",
        role: "Administrador",
        acceso: true,
        permisos: ["dashboardHome", "historial", "tarifas", "impresora", "admin"]
    },
    // --- NUEVOS USUARIOS OPERADORES ---
    {
        user: "Miguel",
        pass: "Parqueo.M2024*",
        role: "Operador",
        acceso: true,
        permisos: ["dashboardHome", "historial", "impresora"]
    },
    {
        user: "Edson",
        pass: "Parking.E2024#",
        role: "Operador",
        acceso: true,
        permisos: ["dashboardHome", "historial", "impresora"]
    },
    {
        user: "David",
        pass: "Estaciona.D2024$",
        role: "Operador",
        acceso: true,
        permisos: ["dashboardHome", "historial", "impresora"]
    },
    {
        user: "Operador",
        pass: "Operador.2024!",
        role: "Operador",
        acceso: true,
        permisos: ["dashboardHome", "historial", "impresora"]
    }
    // --- FIN DE NUEVOS USUARIOS ---
];

// Carga los usuarios desde localStorage. Si no existen, usa la lista por defecto.
let usuarios = JSON.parse(localStorage.getItem("usuarios")) || USUARIOS_DEFAULT;

// Guarda los usuarios por defecto en localStorage si no existen
if (!localStorage.getItem("usuarios")) {
    localStorage.setItem("usuarios", JSON.stringify(USUARIOS_DEFAULT));
}
let usuarioActivo = JSON.parse(localStorage.getItem("usuarioActivo")) || null;
let registros = JSON.parse(localStorage.getItem("registros")) || [];
let tarifas = JSON.parse(localStorage.getItem("tarifas")) || {
    Carro: 5.00,
    Camioneta: 7.00,
    Pickup: 8.00,
    Moto: 3.00,
    Baños: 0.25,
    Dia: 4.00,
    Semana: 20.00,
    Mes: 75.00,
    HoraDiurna: 0.75,
    HoraNocturna: 1.00
};
let impresoras = JSON.parse(localStorage.getItem("impresoras")) || [];

// Permisos disponibles en el sistema (coinciden con los values de los checkboxes)
const PERMISOS_SISTEMA = ["dashboardHome", "historial", "tarifas", "impresora", "admin"];

// =============================
// INICIO - restaurar UI si hay sesión y cargar datos
// =============================
window.onload = () => {
    // si hay usuario en session, recuperar para mantener UI
    if (usuarioActivo) {
        iniciarSesion(true); // true -> llamada desde onload
    } else {
        // Si no hay sesión, igual precargar tarifas/impresoras/usuarios para editar
        cargarTarifasEnInputs();
        renderPrinterList();
        cargarUsuariosEnTabla();
    }
    // Siempre mostrar registros tabla (si existe)
    mostrarRegistros();
    // Preparar toggle del formulario de permisos si existe
    attachPermisosToggle();
};

// =============================
// ENVIAR DATOS A GOOGLE SHEETS
// =============================
function enviarDatos(accion, datos) {
    if (accion === "registrarMovimiento") {
        const datosAjustados = { ...datos };
        // Si hay una fecha de entrada, la convierte a un formato local
        if (datosAjustados.entrada) {
            datosAjustados.entrada = new Date(datosAjustados.entrada).toLocaleString("es-SV", { timeZone: 'America/El_Salvador' });
        }
        // Si hay una fecha de salida, la convierte a un formato local
        if (datosAjustados.salidaFinal) {
            datosAjustados.salidaFinal = new Date(datosAjustados.salidaFinal).toLocaleString("es-SV", { timeZone: 'America/El_Salvador' });
        }
        // Envía los datos ya convertidos
        fetch(APPS_SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",
            cache: "no-cache",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ accion: accion, ...datosAjustados })
        })
        // ... (resto del código)
    } else {
        // ... (resto del código)
    }
}


// =============================
// LOGIN / SESIÓN
// =============================
function login() {
    const u = (document.getElementById("username") || {}).value?.trim() || "";
    const p = (document.getElementById("password") || {}).value?.trim() || "";
    const mensaje = document.getElementById("loginMessage");
    if (!u || !p) {
        if (mensaje) mensaje.innerText = "Ingrese usuario y contraseña.";
        return;
    }
    const encontrado = usuarios.find(x => x.user === u && x.pass === p && x.acceso);
    if (encontrado) {
        usuarioActivo = encontrado;
        localStorage.setItem("usuarioActivo", JSON.stringify(usuarioActivo));
        iniciarSesion();
        if (mensaje) mensaje.innerText = "";
    } else {
        if (mensaje) mensaje.innerText = "Usuario o contraseña incorrectos o sin acceso.";
    }
}

function iniciarSesion(fromOnload = false) {
    // ocultar login y mostrar dashboard
    const loginSection = document.getElementById("loginSection");
    const dashboardEl = document.getElementById("dashboard");
    if (loginSection) loginSection.classList.add("hidden");
    if (dashboardEl) dashboardEl.classList.remove("hidden");

    // actualizar UI y datos
    cargarUsuariosEnTabla();
    cargarTarifasEnInputs();
    renderPrinterList();
    mostrarRegistros();
    configurarPermisos();
    construirMenuSegunPermisos();
    showSection("dashboardHome");
    mostrarSumasDiarias(); // Muestra los totales al iniciar sesión

    // Si se invocó desde onload y hay un elemento que muestra el nombre del usuario, actualizarlo
    actualizarHeaderUsuario();
}

function cerrarSesion() {
    usuarioActivo = null;
    localStorage.removeItem("usuarioActivo");
    // ocultar dashboard volver a login
    const loginSection = document.getElementById("loginSection");
    const dashboardEl = document.getElementById("dashboard");
    if (dashboardEl) dashboardEl.classList.add("hidden");
    if (loginSection) loginSection.classList.remove("hidden");
    // limpiar campos sensibles
    const uname = document.getElementById("username");
    const pass = document.getElementById("password");
    if (uname) uname.value = "";
    if (pass) pass.value = "";
    // reconstruir nav completo para que sea visible a siguiente login
    reconstruirMenuBase();
    // Vuelve a cargar la página para asegurar un estado limpio
    window.location.reload();
}

// =============================
// AYUDERAS - mostrar nombre usuario en header (opcional)
// =============================
function actualizarHeaderUsuario() {
    // Si quieres un elemento que muestre "Usuario: X" puedes implementarlo en HTML con id="usuarioLabel"
    const el = document.getElementById("usuarioLabel");
    if (el) el.innerText = usuarioActivo ? `Usuario: ${usuarioActivo.user}` : "";
}

// =============================
// CONFIGURAR PERMISOS (secciones) - también evita accesos manuales
// =============================
function configurarPermisos() {
    // ocultar o mostrar secciones completas según permisos del usuarioActivo
    // Por simplicidad, manejamos IDs: dashboardHome, historial, tarifas, impresora, admin
    PERMISOS_SISTEMA.forEach(secId => {
        const el = document.getElementById(secId);
        if (!el) return;
        if (!usuarioActivo) {
            el.classList.add("hidden");
            return;
        }
        // administrador con rol "Administrador" tendrá todo, o si el usuario tiene permisos array
        if (usuarioActivo.role === "Administrador") {
            el.classList.remove("hidden");
        } else {
            // verificar permisos del usuario si existiera la propiedad permisos (array)
            if (Array.isArray(usuarioActivo.permisos)) {
                if (usuarioActivo.permisos.includes(secId)) el.classList.remove("hidden");
                else el.classList.add("hidden");
            } else {
                // si no tiene la estructura de permisos, aplicar defaults: operador -> dashboard+impresora+historial
                const defaults = ["dashboardHome", "impresora", "historial"];
                if (defaults.includes(secId)) el.classList.remove("hidden");
                else el.classList.add("hidden");
            }
        }
    });
    construirMenuSegunPermisos();
}

// =============================
// NAVEGACIÓN ENTRE SECCIONES (verifica permisos antes de mostrar)
// =============================
function showSection(id) {
    // Verificar permiso
    if (!puedeAccederA(id)) {
        alert("No tiene permisos para acceder a esta sección.");
        return;
    }

    const secciones = document.querySelectorAll("#dashboard .box");
    secciones.forEach(s => s.classList.add("hidden"));
    const sel = document.getElementById(id);
    if (sel) sel.classList.remove("hidden");

    // acciones específicas por sección
    if (id === "historial") mostrarRegistros();
    if (id === "tarifas") cargarTarifasEnInputs();
    if (id === "admin") cargarUsuariosEnTabla();
    if (id === "impresora") renderPrinterList();
    if (id === "dashboardHome") mostrarSumasDiarias();
}

// Chequea si el usuario activo puede acceder a la sección indicada
function puedeAccederA(secId) {
    if (!usuarioActivo) return false;
    if (usuarioActivo.role === "Administrador") return true;
    if (Array.isArray(usuarioActivo.permisos)) return usuarioActivo.permisos.includes(secId);
    // fallback defaults for operadores
    const defaults = ["dashboardHome", "impresora", "historial"];
    return defaults.includes(secId);
}

// =============================
// GUARDAR / CARGAR localStorage
// =============================
function saveRegistros() {
    localStorage.setItem("registros", JSON.stringify(registros));
}

function saveUsuarios() {
    localStorage.setItem("usuarios", JSON.stringify(usuarios));
    enviarDatos("guardarUsuarios", { usuarios: usuarios });
}

function saveTarifas() {
    localStorage.setItem("tarifas", JSON.stringify(tarifas));
    enviarDatos("guardarTarifas", { tarifas: tarifas });
}

function saveImpresoras() {
    localStorage.setItem("impresoras", JSON.stringify(impresoras));
}

// =============================
// REGISTROS: ENTRADAS (Diurna / Nocturna) - se registra usuarioActivo
// =============================
function registrarEntrada() {
    registrarEntradaConTipo("Diurna");
}

function registrarEntradaNocturna() {
    registrarEntradaConTipo("Nocturna");
}

function registrarEntradaConTipo(tipoEntrada) {
    // Verificar permiso
    if (!puedeAccederA("dashboardHome")) {
        return alert("No tiene permiso para registrar entradas.");
    }

    const plate = (document.getElementById("plate") || {}).value?.trim() || "";
    const tipo = (document.getElementById("tipoLavado") || {}).value || "";
    if (!plate) return alert("Ingrese una placa.");

    const registro = {
        id: Date.now(),
        plate,
        tipo, // Carro, Camioneta, Pickup, Moto, Lavado, etc.
        entrada: new Date().toISOString(),
        salidaFinal: null,
        tiempo: "",
        costo: null,
        entradaTipo: tipoEntrada,
        usuario: usuarioActivo ? usuarioActivo.user : "Operador"
    };
    registros.push(registro);
    saveRegistros();
    enviarDatos("registrarMovimiento", registro);

    // imprimir ticket pertinente
    if (tipoEntrada === "Diurna") imprimirTicketEntradaDiurna(plate, new Date(registro.entrada));
    else imprimirTicketEntradaNocturna(plate, new Date(registro.entrada));

    mostrarRegistros();
    limpiarCampos();
}

function registrarEntradaClientesEspeciales() {
    if (!puedeAccederA("dashboardHome")) {
        return alert("No tiene permiso para registrar entradas de Clientes Especiales.");
    }

    const plate = (document.getElementById("plate") || {}).value?.trim() || "";
    if (!plate) return alert("Ingrese una placa.");

    const registro = {
        id: Date.now(),
        plate,
        tipo: "Clientes Especiales",
        entrada: new Date().toISOString(),
        salidaFinal: null,
        tiempo: "",
        costo: null,
        entradaTipo: "Clientes Especiales", // Nuevo tipo para la lógica de salida
        usuario: usuarioActivo ? usuarioActivo.user : "Operador"
    };
    registros.push(registro);
    saveRegistros();
    enviarDatos("registrarMovimiento", registro);

    imprimirTicketClientesEspeciales(plate, new Date(registro.entrada));
    mostrarRegistros();
    limpiarCampos();
}

// =============================
// REGISTRO: SALIDA (por placa en input) - registra usuario activo
// =============================
function registrarSalida() {
    if (!puedeAccederA("dashboardHome")) {
        return alert("No tiene permiso para registrar salidas.");
    }
    const plate = (document.getElementById("plate") || {}).value?.trim() || "";
    if (!plate) return alert("Ingrese una placa para registrar la salida.");

    const registro = [...registros].reverse().find(r => r.plate === plate && !r.salidaFinal);
    if (!registro) return alert("No se encontró entrada activa para esa placa.");

    registrarSalidaPorId(registro.id);
}

// =============================
// registrarSalidaPorId - calcula tiempo, costo, asigna usuario y guarda
// =============================
function registrarSalidaPorId(id) {
    // permiso
    if (!puedeAccederA("dashboardHome")) {
        return alert("No tiene permiso para registrar salidas.");
    }

    const registro = registros.find(r => r.id === id && !r.salidaFinal);
    if (!registro) return alert("Registro no encontrado o ya tiene salida.");

    registro.salidaFinal = new Date().toISOString();
    registro.usuario = usuarioActivo ? usuarioActivo.user : registro.usuario || "Operador";

    // cálculo de tiempo
    const tEntrada = new Date(registro.entrada);
    const tSalida = new Date(registro.salidaFinal);
    const diffMs = tSalida - tEntrada;
    const totalMin = Math.floor(diffMs / (1000 * 60));
    const horas = Math.floor(totalMin / 60);
    const minutos = totalMin % 60;
    registro.tiempo = `${horas}h ${minutos}m`;

    const horasFact = Math.max(1, Math.ceil(totalMin / 60));

    // cálculo de costo
    let costo = 0;
    if (registro.tipo === "Baños") {
        costo = tarifas.Baños || 0;
    } else if (registro.tipo === "Dia") {
        costo = tarifas.Dia || 0;
    } else if (registro.tipo === "Semana") {
        costo = tarifas.Semana || 0;
    } else if (registro.tipo === "Mes") {
        costo = tarifas.Mes || 0;
    } else if (registro.entradaTipo === "Clientes Especiales") {
        // Lógica de clientes especiales
        const horasFacturables = Math.max(0, horasFact - 1); // Resta la primera hora gratis
        costo = (tarifas.HoraDiurna || 0) * horasFacturables;
    } else {
        if (registro.entradaTipo === "Diurna") {
            costo = (tarifas.HoraDiurna || 0) * horasFact;
        } else if (registro.entradaTipo === "Nocturna") {
            costo = (tarifas.HoraNocturna || 0) * horasFact;
        } else {
            if (registro.tipo && tarifas[registro.tipo] !== undefined) {
                costo = tarifas[registro.tipo] * horasFact;
            } else {
                costo = (tarifas.HoraDiurna || 0) * horasFact;
            }
        }
    }

    registro.costo = parseFloat(costo.toFixed(2));
    saveRegistros();
    enviarDatos("registrarMovimiento", registro);

    // imprimir ticket de salida
    imprimirTicketSalida(registro.plate, registro.entrada, registro.salidaFinal, registro.tiempo, registro.costo, registro.entradaTipo);
    mostrarRegistros();
}

// =============================
// SERVICIOS: LAVADO / BAÑOS
// =============================
function lavadoVehiculo() {
    if (!puedeAccederA("dashboardHome")) {
        return alert("No tiene permiso para registrar lavado.");
    }
    const plate = (document.getElementById("plate") || {}).value?.trim() || "";
    const tipoVeh = (document.getElementById("tipoLavado") || {}).value || "";
    if (!plate || !tipoVeh) return alert("Ingrese placa y seleccione tipo de vehículo para lavado.");

    const costo = tarifas[tipoVeh] !== undefined ? tarifas[tipoVeh] : (tarifas.Lavado || 0);

    const registro = {
        id: Date.now(),
        plate,
        tipo: "Lavado",
        entrada: new Date().toISOString(),
        salidaFinal: new Date().toISOString(),
        tiempo: "0h 0m",
        costo: parseFloat(costo.toFixed(2)),
        entradaTipo: "Servicio",
        usuario: usuarioActivo ? usuarioActivo.user : "Operador"
    };
    registros.push(registro);
    saveRegistros();
    enviarDatos("registrarMovimiento", registro);
    imprimirTicketLavado(plate, tipoVeh, registro.costo);
    mostrarRegistros();
    limpiarCampos();
}

function bañoVehiculo() {
    if (!puedeAccederA("dashboardHome")) {
        return alert("No tiene permiso para registrar baños.");
    }
    const plate = (document.getElementById("plate") || {}).value?.trim() || "";
    const registro = {
        id: Date.now(),
        plate: plate || "",
        tipo: "Baños",
        entrada: new Date().toISOString(),
        salidaFinal: new Date().toISOString(),
        tiempo: "0h 0m",
        costo: parseFloat((tarifas.Baños || 0).toFixed(2)),
        entradaTipo: "Servicio",
        usuario: usuarioActivo ? usuarioActivo.user : "Operador"
    };
    registros.push(registro);
    saveRegistros();
    enviarDatos("registrarMovimiento", registro);
    imprimirTicketBanios(registro.costo);
    mostrarRegistros();
    limpiarCampos();
}

// =============================
// PASES: Día / Semana / Mes
// =============================
function registrarPase(tipoPase) {
    if (!puedeAccederA("dashboardHome")) {
        return alert("No tiene permiso para registrar pases.");
    }
    const plate = (document.getElementById("plate") || {}).value?.trim() || "";
    if (!plate) return alert("Ingrese placa para registrar el pase.");

    const tarifaClave = tipoPase;
    const costo = tarifas[tarifaClave] || 0;

    const registro = {
        id: Date.now(),
        plate,
        tipo: tipoPase,
        entrada: new Date().toISOString(),
        salidaFinal: new Date().toISOString(),
        tiempo: tipoPase === "Dia" ? "Válido: Todo el día" : (tipoPase === "Semana" ? "Válido: 7 días" : "Válido: 30 días"),
        costo: parseFloat(costo.toFixed(2)),
        entradaTipo: "Pase",
        usuario: usuarioActivo ? usuarioActivo.user : "Operador"
    };
    registros.push(registro);
    saveRegistros();
    enviarDatos("registrarMovimiento", registro);

    if (tipoPase === "Dia") imprimirTicketPaseDia(plate, registro.costo);
    if (tipoPase === "Semana") imprimirTicketPaseSemana(plate, registro.costo);
    if (tipoPase === "Mes") imprimirTicketPaseMes(plate, registro.costo);

    mostrarRegistros();
    limpiarCampos();
}

// =============================
// HISTORIAL - RENDER
// =============================
function mostrarRegistros() {
    const tbody = document.getElementById("registrosBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    // orden inverso (último primero)
    registros.slice().reverse().forEach((r, i) => {
        const idx = registros.length - i;
        const placa = r.plate || "";
        const tipo = r.tipo || r.entradaTipo || "";
        const entrada = r.entrada ? new Date(r.entrada).toLocaleString() : "";
        const salida = r.salidaFinal ? new Date(r.salidaFinal).toLocaleString() : "";
        const tiempo = r.tiempo || "";
        const costo = r.costo !== null && r.costo !== undefined ? `$${parseFloat(r.costo).toFixed(2)}` : "";
        const usuario = r.usuario || "";

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${idx}</td>
            <td>${usuario}</td>
            <td>${placa}</td>
            <td>${tipo}</td>
            <td>${entrada}</td>
            <td>${salida}</td>
            <td>${tiempo}</td>
            <td>${costo}</td>
            <td>
                <button onclick="reimprimirTicket(${r.id})">Reimprimir</button>
                ${!r.salidaFinal && r.entradaTipo !== 'Servicio' && r.entradaTipo !== 'Pase' ? `<button onclick="registrarSalidaPorId(${r.id})">Registrar Salida</button>` : ""}
            </td>
        `;
        tbody.appendChild(row);
    });
}

// =============================
// REIMPRIMIR
// =============================
function reimprimirTicket(id) {
    const r = registros.find(x => x.id === id);
    if (!r) return alert("Registro no encontrado para reimprimir.");
    if (!r.salidaFinal) {
        if (r.entradaTipo === "Diurna") imprimirTicketEntradaDiurna(r.plate, new Date(r.entrada));
        else if (r.entradaTipo === "Nocturna") imprimirTicketEntradaNocturna(r.plate, new Date(r.entrada));
        else if (r.entradaTipo === "Clientes Especiales") imprimirTicketClientesEspeciales(r.plate, new Date(r.entrada));
        else imprimirTicketGenericoEntrada(r.plate, new Date(r.entrada));
    } else {
        imprimirTicketSalida(r.plate, r.entrada, r.salidaFinal, r.tiempo, r.costo, r.entradaTipo);
    }
}

// =============================
// IMPRESIÓN - HELPERS
// =============================
function abrirVentanaImpresion(html) {
    const w = window.open("", "_blank", "width=350,height=600");
    if (!w) return alert("Por favor permita las ventanas emergentes para poder imprimir.");
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
}

function imprimirTicketEntradaDiurna(placa, fecha) {
    const contenido = ticketTemplate(
        "Entrada Diurna",
        placa,
        fecha,
        `Costo por hora o fracción: $${(tarifas.HoraDiurna || 0).toFixed(2)}`,
        `Registrado por: ${usuarioActivo ? usuarioActivo.user : "Operador"}`
    );
    abrirVentanaImpresion(contenido);
}

function imprimirTicketEntradaNocturna(placa, fecha) {
    const contenido = ticketTemplate(
        "Entrada Nocturna",
        placa,
        fecha,
        `Costo por hora o fracción: $${(tarifas.HoraNocturna || 0).toFixed(2)}`,
        `Registrado por: ${usuarioActivo ? usuarioActivo.user : "Operador"}`
    );
    abrirVentanaImpresion(contenido);
}

function imprimirTicketClientesEspeciales(placa, fecha) {
    const contenido = ticketTemplate(
        "Clientes Especiales",
        placa,
        fecha,
        `1 hora gratis, después: $${(tarifas.HoraDiurna || 0).toFixed(2)}/h`,
        `Registrado por: ${usuarioActivo ? usuarioActivo.user : "Operador"}`
    );
    abrirVentanaImpresion(contenido);
}

function imprimirTicketSalida(placa, entradaIso, salidaIso, tiempo, costo, entradaTipo) {
    const contenido = ticketTemplateSalidaTermica(
        placa,
        entradaIso ? new Date(entradaIso) : null,
        salidaIso ? new Date(salidaIso) : null,
        tiempo,
        costo,
        entradaTipo,
        usuarioActivo ? usuarioActivo.user : "Operador"
    );
    abrirVentanaImpresion(contenido);
}

function imprimirTicketLavado(placa, tipoVeh, costo) {
    const html = `
    <html><head><style>
      body{font-family:monospace;margin:0;padding:0;font-size:22px;}
      .ticket{width:320px;padding:10px;text-align:center;}
      h2{margin:4px 0;font-size:24px;text-align:center;}
      h3{margin:4px 0;font-size:22px;text-align:center;}
      p{margin:3px 0;font-size:20px;}
      hr{border:0;border-top:1px dashed #000;margin:6px 0;}
      .disclaimer{font-size:16px;font-weight:bold;color:#555;}
    </style></head><body>
      <div class="ticket">
        <h2>🚗 Control de Parqueo</h2>
        <h3>Lavado de Vehículo</h3>
        <hr>
        <p>Placa: ${placa}</p>
        <p>Tipo vehículo: ${tipoVeh}</p>
        <p>Costo: $${parseFloat(costo).toFixed(2)}</p>
        <hr>
        <p>Registrado por: ${usuarioActivo ? usuarioActivo.user : "Operador"}</p>
        <p>Fecha/Hora: ${new Date().toLocaleString()}</p>
        <hr>
        <p class="disclaimer">El cálculo de tiempo de<br>estacionamiento se basa en los<br>datos impresos en este ticket y se<br>cobrarán según la tarifa establecida.</p>
      </div>
    </body></html>`;
    abrirVentanaImpresion(html);
}

function imprimirTicketBanios(costo) {
    const html = `
    <html><head><style>
      body{font-family:monospace;margin:0;padding:0;font-size:22px;}
      .ticket{width:320px;padding:10px;text-align:center;}
      h2{margin:4px 0;font-size:24px;text-align:center;}
      h3{margin:4px 0;font-size:22px;text-align:center;}
      p{margin:3px 0;font-size:20px;}
      hr{border:0;border-top:1px dashed #000;margin:6px 0;}
      .disclaimer{font-size:16px;font-weight:bold;color:#555;}
    </style></head><body>
      <div class="ticket">
        <h2>🚻 Control de Parqueo</h2>
        <h3>Baños</h3>
        <p>Por favor use y cuide las instalaciones.</p>
        <hr>
        <p>Costo: $${parseFloat(costo).toFixed(2)}</p>
        <hr>
        <p>Registrado por: ${usuarioActivo ? usuarioActivo.user : "Operador"}</p>
        <p>Fecha/Hora: ${new Date().toLocaleString()}</p>
        <hr>
        <p class="disclaimer">CONTRIBUCIÓN PARROQUIAL<br>El cálculo de tiempo de<br>estacionamiento se basa en los<br>datos impresos en este ticket<br>agradecemos su preferencia y contribución.</p>
      </div>
    </body></html>`;
    abrirVentanaImpresion(html);
}

function imprimirTicketPaseDia(placa, costo) {
    const html = `
    <html><head><style>
      body{font-family:monospace;margin:0;padding:0;font-size:22px;}
      .ticket{width:320px;padding:10px;text-align:center;}
      h2{margin:4px 0;font-size:24px;text-align:center;}
      h3{margin:4px 0;font-size:22px;text-align:center;}
      p{margin:3px 0;font-size:20px;}
      hr{border:0;border-top:1px dashed #000;margin:6px 0;}
      .disclaimer{font-size:16px;font-weight:bold;color:#555;}
    </style></head><body>
      <div class="ticket">
        <h2>🚗 Control de Parqueo</h2>
        <h3>Pase - Vehículo Todo el Día</h3>
        <hr>
        <p>Placa: ${placa}</p>
        <p>Válido: Todo el día (${new Date().toLocaleDateString()})</p>
        <p>Costo: $${parseFloat(costo).toFixed(2)}</p>
        <hr>
        <p>Registrado por: ${usuarioActivo ? usuarioActivo.user : "Operador"}</p>
        <p>Fecha/Hora: ${new Date().toLocaleString()}</p>
        <hr>
        <p class="disclaimer">El cálculo de tiempo de<br>estacionamiento se basa en los<br>datos impresos en este ticket y se<br>cobrarán según la tarifa establecida.</p>
      </div>
    </body></html>`;
    abrirVentanaImpresion(html);
}

function imprimirTicketPaseSemana(placa, costo) {
    const ahora = new Date();
    const fin = new Date();
    fin.setDate(ahora.getDate() + 7);
    const html = `
    <html><head><style>
      body{font-family:monospace;margin:0;padding:0;font-size:22px;}
      .ticket{width:320px;padding:10px;text-align:center;}
      h2{margin:4px 0;font-size:24px;text-align:center;}
      h3{margin:4px 0;font-size:22px;text-align:center;}
      p{margin:3px 0;font-size:20px;}
      hr{border:0;border-top:1px dashed #000;margin:6px 0;}
      .disclaimer{font-size:16px;font-weight:bold;color:#555;}
    </style></head><body>
      <div class="ticket">
        <h2>🚗 Control de Parqueo</h2>
        <h3>Pase - Vehículo Toda la Semana</h3>
        <hr>
        <p>Placa: ${placa}</p>
        <p>Válido: ${ahora.toLocaleDateString()} → ${fin.toLocaleDateString()}</p>
        <p>Costo: $${parseFloat(costo).toFixed(2)}</p>
        <hr>
        <p>Registrado por: ${usuarioActivo ? usuarioActivo.user : "Operador"}</p>
        <p>Fecha/Hora: ${new Date().toLocaleString()}</p>
        <hr>
        <p class="disclaimer">El cálculo de tiempo de<br>estacionamiento se basa en los<br>datos impresos en este ticket y se<br>cobrarán según la tarifa establecida.</p>
      </div>
    </body></html>`;
    abrirVentanaImpresion(html);
}

function imprimirTicketPaseMes(placa, costo) {
    const ahora = new Date();
    const fin = new Date();
    fin.setMonth(ahora.getMonth() + 1);
    const html = `
    <html><head><style>
      body{font-family:monospace;margin:0;padding:0;font-size:22px;}
      .ticket{width:320px;padding:10px;text-align:center;}
      h2{margin:4px 0;font-size:24px;text-align:center;}
      h3{margin:4px 0;font-size:22px;text-align:center;}
      p{margin:3px 0;font-size:20px;}
      hr{border:0;border-top:1px dashed #000;margin:6px 0;}
      .disclaimer{font-size:16px;font-weight:bold;color:#555;}
    </style></head><body>
      <div class="ticket">
        <h2>🚗 Control de Parqueo</h2>
        <h3>Pase - Vehículo Todo el Mes</h3>
        <hr>
        <p>Placa: ${placa}</p>
        <p>Válido: ${ahora.toLocaleDateString()} → ${fin.toLocaleDateString()}</p>
        <p>Costo: $${parseFloat(costo).toFixed(2)}</p>
        <hr>
        <p>Registrado por: ${usuarioActivo ? usuarioActivo.user : "Operador"}</p>
        <p>Fecha/Hora: ${new Date().toLocaleString()}</p>
        <hr>
        <p class="disclaimer">El cálculo de tiempo de<br>estacionamiento se basa en los<br>datos impresos en este ticket y se<br>cobrarán según la tarifa establecida.</p>
      </div>
    </body></html>`;
    abrirVentanaImpresion(html);
}

function ticketTemplate(titulo, placa, fecha, lineaInfo, footer) {
    return `
    <html><head><style>
      body{font-family:monospace;margin:0;padding:0;font-size:22px;}
      .ticket{width:320px;padding:10px;text-align:center;}
      h2{margin:4px 0;font-size:24px;text-align:center;}
      h3{margin:4px 0;font-size:22px;text-align:center;}
      p{margin:3px 0;font-size:20px;}
      hr{border:0;border-top:1px dashed #000;margin:6px 0;}
      .disclaimer{font-size:16px;font-weight:bold;color:#555;}
    </style></head><body>
      <div class="ticket">
        <h2>🚗 Control de Parqueo</h2>
        <h3>${titulo}</h3>
        <hr>
        <p>Placa: ${placa}</p>
        <p>Entrada: ${fecha.toLocaleString()}</p>
        <p>${lineaInfo}</p>
        <hr>
        <p>${footer || ""}</p>
        <p>Fecha/Hora: ${new Date().toLocaleString()}</p>
        <hr>
        <p class="disclaimer">El cálculo de tiempo de<br>estacionamiento se basa en los<br>datos impresos en este ticket y se<br>cobrarán según la tarifa establecida.</p>
      </div>
    </body></html>
    `;
}

function ticketTemplateSalidaTermica(placa, entrada, salida, tiempo, costo, entradaTipo, usuario) {
    const entradaTxt = entrada ? entrada.toLocaleString() : "";
    const salidaTxt = salida ? salida.toLocaleString() : "";
    return `
    <html><head><style>
      body{font-family:monospace;margin:0;padding:0;font-size:22px;width:320px;}
      .ticket{width:320px;padding:10px;text-align:center;}
      h2, h3, p{margin:2px 0;text-align:center;}
      h2{font-size:24px;}
      h3{font-size:22px;}
      p{font-size:20px;}
      hr{border:0;border-top:1px dashed #000;margin:6px 0;}
      .disclaimer{font-size:16px;font-weight:bold;color:#555;}
    </style></head><body>
      <div class="ticket">
        <h2>🚗 Control de Parqueo</h2>
        <h3>Ticket de Salida</h3>
        <hr>
        <p>Placa: <b>${placa}</b></p>
        <p>Tipo: ${entradaTipo || "General"}</p>
        <p>Entrada: ${entradaTxt}</p>
        <p>Salida: ${salidaTxt}</p>
        <p>Tiempo: <b>${tiempo}</b></p>
        <hr>
        <p>Total a Pagar:</p>
        <h3>$${costo !== null && costo !== undefined ? parseFloat(costo).toFixed(2) : "0.00"}</h3>
        <hr>
        <p style="font-size:16px;">Registrado por: ${usuario || "Operador"}</p>
        <p style="font-size:16px;">Fecha/Hora: ${new Date().toLocaleString()}</p>
        <hr>
        <p class="disclaimer">CONTRIBUCIÓN PARROQUIAL<br>El cálculo de tiempo de<br>estacionamiento se basa en los<br>datos impresos en este ticket<br>agradecemos su preferencia y contribución.</p>
      </div>
    </body></html>
    `;
}

function imprimirTicketGenericoEntrada(placa, fecha) {
    const contenido = ticketTemplate("Entrada", placa, fecha, "", `Registrado por: ${usuarioActivo ? usuarioActivo.user : "Operador"}`);
    abrirVentanaImpresion(contenido);
}

// =============================
// LIMPIAR CAMPOS (UI)
// =============================
function limpiarCampos() {
    const plateEl = document.getElementById("plate");
    const tipoEl = document.getElementById("tipoLavado");
    if (plateEl) plateEl.value = "";
    if (tipoEl) tipoEl.value = "";
}

// =============================
// GESTIÓN DE USUARIOS (ADMIN)
// - Crear con permisos marcados (checkboxes)
// - Cargar tabla con permisos
// - Bloquear/activar/Eliminar
// =============================
function attachPermisosToggle() {
    // Si existe select role, ajustar checkboxes por defecto
    const select = document.getElementById("newRole");
    if (select) {
        select.addEventListener("change", togglePermisos);
        togglePermisos(); // init
    }
}

function togglePermisos() {
    // Si rol = Administrador -> marcar todas las casillas
    const role = (document.getElementById("newRole") || {}).value || "Operador";
    const container = document.getElementById("permisosContainer");
    if (!container) return;
    const checkboxes = container.querySelectorAll("input[type=checkbox]");
    checkboxes.forEach(cb => {
        if (role === "Administrador") cb.checked = true;
        else {
            // defaults para Operador: dashboardHome, impresora, historial checked
            if (cb.value === "dashboardHome" || cb.value === "impresora" || cb.value === "historial") cb.checked = true;
            else cb.checked = false;
        }
    });
}

function agregarUsuario() {
    // Datos
    const u = (document.getElementById("newUser") || {}).value?.trim() || "";
    const p = (document.getElementById("newPass") || {}).value?.trim() || "";
    const r = (document.getElementById("newRole") || {}).value || "Operador";
    const container = document.getElementById("permisosContainer");
    if (!u || !p) return alert("Ingrese usuario y contraseña.");

    // comprobar duplicado
    if (usuarios.find(x => x.user === u)) return alert("El usuario ya existe.");

    // leer permisos marcados
    const permisos = [];
    if (container) {
        const checkboxes = container.querySelectorAll("input[type=checkbox]");
        checkboxes.forEach(cb => {
            if (cb.checked) permisos.push(cb.value);
        });
    }

    const nuevoUsuario = {
        user: u,
        pass: p,
        role: r,
        acceso: true,
        permisos: permisos
    };
    usuarios.push(nuevoUsuario);
    saveUsuarios();
    cargarUsuariosEnTabla();
    alert("Usuario agregado con éxito.");
    // Limpiar formulario
    document.getElementById("newUser").value = "";
    document.getElementById("newPass").value = "";
    togglePermisos();
}

function cargarUsuariosEnTabla() {
    const tbody = document.getElementById("usuariosTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";
    usuarios.forEach((u, i) => {
        const row = document.createElement("tr");
        const permisosStr = u.permisos && u.permisos.length > 0 ? u.permisos.join(', ') : 'Ninguno';
        row.innerHTML = `
            <td>${u.user}</td>
            <td>${u.role}</td>
            <td>${u.acceso ? 'Activo' : 'Bloqueado'}</td>
            <td>${permisosStr}</td>
            <td>
                <button onclick="toggleAcceso('${u.user}')">${u.acceso ? 'Bloquear' : 'Activar'}</button>
                <button onclick="eliminarUsuario('${u.user}')" class="delete-btn">Eliminar</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function toggleAcceso(user) {
    const u = usuarios.find(x => x.user === user);
    if (!u) return;
    u.acceso = !u.acceso;
    saveUsuarios();
    cargarUsuariosEnTabla();
}

function eliminarUsuario(user) {
    if (confirm(`¿Está seguro de que desea eliminar al usuario ${user}?`)) {
        usuarios = usuarios.filter(x => x.user !== user);
        saveUsuarios();
        cargarUsuariosEnTabla();
        // Si el usuario activo se elimina, cerrar sesión
        if (usuarioActivo && usuarioActivo.user === user) {
            cerrarSesion();
        }
    }
}

// =============================
// GESTIÓN DE TARIFAS
// =============================
function guardarTarifas() {
    const inputs = document.querySelectorAll('#tarifas input[type="number"]');
    inputs.forEach(input => {
        const tarifaName = input.id.replace('tarifa-', '');
        tarifas[tarifaName] = parseFloat(input.value) || 0;
    });
    saveTarifas();
    alert("Tarifas guardadas con éxito.");
}

function cargarTarifasEnInputs() {
    const inputs = document.querySelectorAll('#tarifas input[type="number"]');
    inputs.forEach(input => {
        const tarifaName = input.id.replace('tarifa-', '');
        if (tarifas[tarifaName] !== undefined) {
            input.value = tarifas[tarifaName].toFixed(2);
        }
    });
}

// =============================
// GESTIÓN DE IMPRESORAS
// =============================
function addPrinter() {
    const printerName = document.getElementById("printerName").value.trim();
    if (printerName && !impresoras.includes(printerName)) {
        impresoras.push(printerName);
        saveImpresoras();
        renderPrinterList();
        document.getElementById("printerName").value = "";
        alert("Impresora agregada con éxito.");
    }
}

function deletePrinter(name) {
    impresoras = impresoras.filter(p => p !== name);
    saveImpresoras();
    renderPrinterList();
    alert("Impresora eliminada.");
}

function renderPrinterList() {
    const list = document.getElementById("printerList");
    if (!list) return;
    list.innerHTML = "";
    impresoras.forEach(p => {
        const li = document.createElement("li");
        li.innerHTML = `${p} <button onclick="deletePrinter('${p}')" class="delete-btn">Eliminar</button>`;
        list.appendChild(li);
    });
}

// =============================
// RESUMEN DIARIO
// =============================
function mostrarSumasDiarias() {
    const dailySummaryDiv = document.getElementById('dailySummary');
    if (!dailySummaryDiv) return;

    const hoy = new Date().toISOString().slice(0, 10);
    const registrosHoy = registros.filter(r => r.salidaFinal && new Date(r.salidaFinal).toISOString().slice(0, 10) === hoy);

    const ingresosPorTipo = registrosHoy.reduce((acc, r) => {
        const tipo = r.entradaTipo || r.tipo;
        acc[tipo] = (acc[tipo] || 0) + (r.costo || 0);
        return acc;
    }, {});
    
    // Obtener la suma total de ingresos y de movimientos
    const totalIngresos = Object.values(ingresosPorTipo).reduce((acc, current) => acc + current, 0);
    const totalMovimientos = registrosHoy.length;

    // Generar el HTML para mostrar los totales
    let htmlContent = `
        <p><b>Total de Ingresos: $${totalIngresos.toFixed(2)}</b></p>
        <p><b>Total de Movimientos: ${totalMovimientos}</b></p>
        <br>
        <h4>Desglose por Servicio:</h4>
    `;

    // Mapear los tipos de servicio a nombres más descriptivos
    const nombresServicios = {
        "Diurna": "Entrada Diurna",
        "Nocturna": "Entrada Nocturna",
        "Lavado": "Lavado de Vehículo",
        "Baños": "Entrada a Baños",
        "Pase": "Pases de Vehículo",
        "Clientes Especiales": "Clientes Especiales"
    };

    // Crear un objeto con los tipos de servicio para mostrar
    const desglose = {
        "Entrada Diurna": 0,
        "Entrada Nocturna": 0,
        "Lavado de Vehículo": 0,
        "Entrada a Baños": 0,
        "Pase - Día": 0,
        "Pase - Semana": 0,
        "Pase - Mes": 0,
        "Clientes Especiales": 0
    };

    // Llenar el objeto de desglose con los datos calculados
    for (const tipo in ingresosPorTipo) {
        if (nombresServicios[tipo]) {
            desglose[nombresServicios[tipo]] = ingresosPorTipo[tipo];
        } else if (tipo === "Dia" || tipo === "Semana" || tipo === "Mes") {
            desglose[`Pase - ${tipo}`] = ingresosPorTipo[tipo];
        }
    }

    // Agregar el desglose al HTML
    for (const nombre in desglose) {
        htmlContent += `<p>${nombre}: <b>$${desglose[nombre].toFixed(2)}</b></p>`;
    }
    
    htmlContent += `<br><button onclick="registrarTotalesDiarios()">Enviar resumen diario a Google Sheets</button>`;

    dailySummaryDiv.innerHTML = htmlContent;
}


function registrarTotalesDiarios() {
  const hoy = new Date().toISOString().slice(0, 10);
  const totalIngresosPorTipo = {
    "Entrada Diurna": 0,
    "Entrada Nocturna": 0,
    "Lavado de Vehículo": 0,
    "Entrada a Baños": 0,
    "Pase - Día": 0,
    "Pase - Semana": 0,
    "Pase - Mes": 0,
    "Clientes Especiales": 0
  };

  const registrosHoy = registros.filter(r => r.salidaFinal && new Date(r.salidaFinal).toISOString().slice(0, 10) === hoy);

  registrosHoy.forEach(r => {
    let tipoServicio = r.entradaTipo || r.tipo;
    if (tipoServicio === "Diurna") totalIngresosPorTipo["Entrada Diurna"] += r.costo;
    else if (tipoServicio === "Nocturna") totalIngresosPorTipo["Entrada Nocturna"] += r.costo;
    else if (tipoServicio === "Lavado") totalIngresosPorTipo["Lavado de Vehículo"] += r.costo;
    else if (tipoServicio === "Baños") totalIngresosPorTipo["Entrada a Baños"] += r.costo;
    else if (tipoServicio === "Dia") totalIngresosPorTipo["Pase - Día"] += r.costo;
    else if (tipoServicio === "Semana") totalIngresosPorTipo["Pase - Semana"] += r.costo;
    else if (tipoServicio === "Mes") totalIngresosPorTipo["Pase - Mes"] += r.costo;
    else if (tipoServicio === "Clientes Especiales") totalIngresosPorTipo["Clientes Especiales"] += r.costo;
  });

  const datosTotales = {
    totalIngresos: parseFloat(Object.values(totalIngresosPorTipo).reduce((acc, current) => acc + current, 0).toFixed(2)),
    totalMovimientos: registrosHoy.length,
    ingresosPorTipo: totalIngresosPorTipo,
    fecha: new Date().toLocaleDateString()
  };
  
  enviarDatos("registrarTotalesDiarios", datosTotales);
  alert("Resumen diario enviado a Google Sheets.");
}

// Helper para construir el menú de navegación según los permisos
function construirMenuSegunPermisos() {
    const nav = document.getElementById('mainNav');
    if (!nav) return;
    nav.innerHTML = '';
    const menuItems = {
        'dashboardHome': 'Inicio',
        'historial': 'Historial',
        'tarifas': 'Tarifas',
        'impresora': 'Impresora',
        'admin': 'Administración'
    };
    for (const id in menuItems) {
        if (puedeAccederA(id)) {
            const link = document.createElement('a');
            link.href = '#';
            link.onclick = () => showSection(id);
            link.innerText = menuItems[id];
            nav.appendChild(link);
        }
    }
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'logout-btn';
    logoutBtn.onclick = cerrarSesion;
    logoutBtn.innerText = 'Cerrar Sesión';
    nav.appendChild(logoutBtn);
}

// Reconstruir menu al cerrar sesion
function reconstruirMenuBase() {
    const nav = document.getElementById('mainNav');
    if (!nav) return;
    nav.innerHTML = `
        <a href="#" onclick="showSection('dashboardHome')">Inicio</a>
        <a href="#" onclick="showSection('historial')">Historial</a>
        <a href="#" onclick="showSection('tarifas')">Tarifas</a>
        <a href="#" onclick="showSection('impresora')">Impresora</a>
        <a href="#" onclick="showSection('admin')">Administración</a>
        <button class="logout-btn" onclick="cerrarSesion()">Cerrar Sesión</button>
    `;
}
