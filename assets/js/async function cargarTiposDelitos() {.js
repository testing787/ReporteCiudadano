async function cargarTiposDelitos() {
    const selectDelito = document.getElementById("tipo_reporte");
    if (!selectDelito) return;

    // Estado visual de carga
    selectDelito.disabled = true;
    selectDelito.options[0].textContent = "Cargando opciones...";

    try {
        // Ajusta los nombres de colección/documento según como los guardaste en Firestore
        const docRef = doc(db, "Delitos", "Tipos_Delitos");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const { lista = [] } = docSnap.data();
            const fragmento = document.createDocumentFragment();

            lista.forEach((delito) => {
                const option = document.createElement("option");
                option.value = delito;
                option.textContent = delito;
                fragmento.appendChild(option);
            });

            // Limpiamos y agregamos las opciones
            selectDelito.innerHTML = '<option value="">Seleccione</option>';
            selectDelito.appendChild(fragmento);
        } else {
            console.warn("No se encontró el documento de tipos de delitos.");
            selectDelito.options[0].textContent = "Error al cargar opciones";
        }
    } catch (error) {
        console.error("Error al cargar tipos de delitos:", error);
        selectDelito.options[0].textContent = "Error al cargar opciones";
    } finally {
        selectDelito.disabled = false;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // Se ejecutan al mismo tiempo
    Promise.all([
        cargarMunicipios(),
        cargarTiposDelitos()
    ]).catch(err => console.error("Error al inicializar los selectores:", err));
}); 
 const numevoReporte = {
            tipoReporte: document.getElementById("tipo_reporte")?.value || "",
            tipoDelito: document.getElementById("tipoDelito")?.value || "",
            correo: document.getElementById("correo")?.value || "",
            municipio: document.getElementById("municipio")?.value || "",
            cp: document.getElementById("cCP")?.value || "",
            fechaHechos: document.getElementById("fechaHechos")?.value || "",
            medioAcontecio: document.getElementById("medio")?.value || "",
            comoOcurrio: document.getElementById("como_ocurrio")?.value || "",
            evidenciaLinks: document.getElementById("evidencia_links")?.value || ""
        };