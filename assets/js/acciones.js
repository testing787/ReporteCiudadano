import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyBHhpAl2gg11K1_BFkJ_KlhL8roeuNsHl8",
    authDomain: "reportes-dig.firebaseapp.com",
    projectId: "reportes-dig",
    storageBucket: "reportes-dig.firebasestorage.app",
    messagingSenderId: "315273915724",
    appId: "1:315273915724:web:5ec63e5979c2c63752b3e9",
    measurementId: "G-PE76CZ5YBR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const analytics = getAnalytics(app);
const storage = getStorage(app); // Corregido: 'storange' -> 'storage' y pasándole 'app'


function mostrarDatos() {
    const radioAnonimato = document.querySelector('input[name="anonimato"]:checked');

    if (!radioAnonimato) return;

    const datos = radioAnonimato.value;
    const selectstodos = document.getElementById('seccion-datos-personales');
    const selectstodos2 = document.getElementById('formularioPA');
    const seccionFirst = document.getElementById('formulario-reportante');

    const inputsObli = selectstodos2 ? selectstodos2.querySelectorAll('[required]') : [];

    if (datos === 'esconder') {
        if (selectstodos) selectstodos.style.display = 'none';
        if (selectstodos2) selectstodos2.style.display = 'none';
        if (seccionFirst) seccionFirst.style.display = 'none';

        inputsObli.forEach(input => input.required = false);
    } else {
        if (selectstodos) selectstodos.style.display = 'block';
        if (selectstodos2) selectstodos2.style.display = 'block';
        if (seccionFirst) seccionFirst.style.display = 'block';

        inputsObli.forEach(input => input.required = true);
    }
}

document.addEventListener("DOMContentLoaded", mostrarDatos);
window.mostrarDatos = mostrarDatos;

// Cargar opciones en los selects dinámicamente desde Firestore
async function agregarDatos(idSelect, coleccion, documento, textoPorDefecto = "Seleccione") {
    const select = document.getElementById(idSelect);
    if (!select) return;

    try {
        const docSnap = await getDoc(doc(db, coleccion, documento));

        if (docSnap.exists()) {
            const { lista = [] } = docSnap.data();
            const fragmento = document.createDocumentFragment();

            lista.forEach((item) => {
                const option = document.createElement("option");
                option.value = item;
                option.textContent = item;
                fragmento.appendChild(option);
            });

            select.innerHTML = `<option value="">${textoPorDefecto}</option>`;
            select.appendChild(fragmento);
        }
    } catch (error) {
        console.error(`Error al cargar el select ${idSelect}:`, error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    Promise.all([
        agregarDatos("municipio", "Municipios", "Municipios_Ver", "Seleccione un municipio"),
        agregarDatos("tipo_reporte", "ReportesTipos", "tipReportes", "Seleccione un tipo de reporte"),
        agregarDatos("tipoDelito", "Delitos", "tiposDelitos", "Seleccione un delito")
    ]);
});

// Variable global para almacenar los archivos a subir
let archivosSeleccionados = [];

const formReporte = document.getElementById("formReporte");
const btnGuardar = document.getElementById("btnGuardar");

// Guardar información del formulario de los hechos
formReporte.addEventListener("submit", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    btnGuardar.disabled = true;
    btnGuardar.textContent = "Guardando...";

    try {
        const reporteNuevo = new Date();
        const fechaString = reporteNuevo.toISOString().replace(/[-:T.]/g, "").slice(0, 14); // Formato YYYYMMDDHHMMSS
        const idPersonalizado = `REPORTE-${fechaString}`;

        let urlsGuardadas = []; // Corregido: plural en todo el scope

        if (archivosSeleccionados.length > 0) {
            btnGuardar.textContent = "Subiendo archivos...";
            urlsGuardadas = await subirMultiplesArchivos(archivosSeleccionados, idPersonalizado);
        }

        /* const linkManual = document.getElementById('evidencia_links')?.value.trim();
         if (linkManual) {
             urlsGuardadas.push(linkManual);
         }*/

        const nuevoReporte = {
            folio: idPersonalizado,
            comoOcurrio: document.getElementById('como_ocurrio').value,
            correo: document.getElementById('correo').value,
            cp: document.getElementById('cCP').value,
            descripReport: document.getElementById('tipo_reporte').value,
            FechaHechos: document.getElementById('fechaHechos').value,
            medioAcontecio: document.getElementById('medio').value,
            municipio: document.getElementById('municipio').value,
            tipoDelito: document.getElementById('tipoDelito').value,
            // evidenciaLinks: urlsGuardadas,
            creadoEl: serverTimestamp()
        };

        btnGuardar.textContent = "Guardando reporte..."; // Corregido: btnguardar -> btnGuardar
        const docRef = doc(db, 'reportes', idPersonalizado);
        await setDoc(docRef, nuevoReporte);

        console.log("Reporte guardado con éxito con ID:", idPersonalizado);
        alert('¡Reporte guardado con éxito! Folio: ' + idPersonalizado);

        formReporte.reset();
        limpiarVistaPrevia();

    } catch (error) {
        console.error("Error al guardar el reporte:", error);
        alert("Hubo un error al guardar el reporte. Por favor, inténtelo de nuevo.");
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.textContent = "Enviar Reporte";
    }
});

/* Función agregada para la subida de archivos a Storage en secuencia
async function subirMultiplesArchivos(archivos, folio) {
    const urls = [];

    for (let i = 0; i < archivos.length; i++) {
        const archivo = archivos[i];
        const nombreLimpio = archivo.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const rutaStorage = `evidencias/${folio}_${i}_${nombreLimpio}`;
        const storageRef = ref(storage, rutaStorage);

        const uploadTask = uploadBytesResumable(storageRef, archivo);

        const downloadURL = await new Promise((resolve, reject) => {
            uploadTask.on('state_changed',
                null,
                (error) => {
                    console.error(`Error al subir ${archivo.name}:`, error);
                    reject(error);
                },
                async () => {
                    const url = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(url);
                }
            );
        });

        urls.push(downloadURL);
    }

    return urls;
}*/

// Elementos de la vista previa
const fileInput = document.getElementById("file_input");
const previewContenedor = document.getElementById("preview_contenedor");
const previewImg = document.getElementById("preview_img");
const previewIcon = document.getElementById("preview_icon");
const previewNombre = document.getElementById("preview_nombre");
const previewTamano = document.getElementById("preview_tamano");
const btnEliminarArchivo = document.getElementById("btnEliminarArchivo");

// Detectar selección de archivos
fileInput.addEventListener("change", function () {
    const archivos = Array.from(this.files);

    if (archivos.length > 0) {
        archivosSeleccionados = archivos.filter(archivo => {
            if (archivo.size > 10 * 1024 * 1024) {
                alert(`El archivo "${archivo.name}" excede los 10 MB permitidos y no será incluido.`);
                return false;
            }
            return true;
        });

        if (archivosSeleccionados.length === 0) {
            limpiarVistaPrevia();
            return;
        }

        const primerArchivo = archivosSeleccionados[0];

        if (archivosSeleccionados.length === 1) {
            previewNombre.textContent = primerArchivo.name;
        } else {
            previewNombre.textContent = `${primerArchivo.name} (+${archivosSeleccionados.length - 1} más)`;
        }

        const tamanoTotalBytes = archivosSeleccionados.reduce((acc, f) => acc + f.size, 0);
        const tamanoReadable = tamanoTotalBytes < 1024 * 1024
            ? (tamanoTotalBytes / 1024).toFixed(1) + ' KB'
            : (tamanoTotalBytes / (1024 * 1024)).toFixed(1) + ' MB';
        previewTamano.textContent = tamanoReadable;

        if (primerArchivo.type.startsWith("image/")) {
            previewImg.src = URL.createObjectURL(primerArchivo);
            previewImg.style.display = "block";
            previewIcon.style.display = "none";
        } else {
            previewImg.style.display = "none";
            previewIcon.style.display = "block";

            if (primerArchivo.type.includes("pdf")) {
                previewIcon.textContent = "📄 PDF";
            } else if (primerArchivo.type.includes("word") || primerArchivo.name.endsWith(".doc") || primerArchivo.name.endsWith(".docx")) {
                previewIcon.textContent = "📝 DOCX";
            } else if (primerArchivo.type.startsWith("audio/")) {
                previewIcon.textContent = "🎵 AUDIO";
            } else if (primerArchivo.type.startsWith("video/")) {
                previewIcon.textContent = "🎥 VIDEO";
            } else {
                previewIcon.textContent = "📁 ARCHIVO";
            }
        }

        previewContenedor.style.display = "block";
    } else {
        limpiarVistaPrevia();
    }
});

btnEliminarArchivo.addEventListener("click", function () {
    limpiarVistaPrevia();
});

function limpiarVistaPrevia() {
    fileInput.value = "";
    archivosSeleccionados = [];

    if (previewImg.src && previewImg.src.includes('blob:')) {
        URL.revokeObjectURL(previewImg.src);
    }

    previewImg.src = "";
    previewImg.style.display = "none";
    previewIcon.style.display = "none";
    previewContenedor.style.display = "none";
}