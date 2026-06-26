import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";

// ─── Identidad Orygen ───
const C = {
  orange: "#D64100",
  orangeLight: "#E8522A",
  orangeBg: "#FBE8E0",
  navy: "#16222E",
  navySoft: "#2A3947",
  cream: "#F5EFE8",
  white: "#FFFFFF",
  slate: "#5C6670",
  line: "#E3DAD0",
  green: "#1E7B4F",
  greenBg: "#E4F2EA",
  red: "#B3261E",
  redBg: "#FBEAE9",
  blue: "#1A5276",
  blueBg: "#E4EEF5",
  amber: "#9A6B00",
  amberBg: "#FCF3DC",
};

const CENTRALES = [
  { label: "C. T. Santa Rosa", value: "SANTA ROSA" },
  { label: "C.C. Ventanilla", value: "VENTANILLA" },
];

const FONT = "'Barlow', system-ui, sans-serif";
const FONT_COND = "'Barlow Condensed', 'Barlow', system-ui, sans-serif";

// Semana operativa: Sábado a Viernes
const DIAS = ["Sáb", "Dom", "Lun", "Mar", "Mié", "Jue", "Vie"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const EMPRESAS_DEFAULT = ["MAGNEX", "UNITELEC", "SEFREL", "DIM", "T&D ELECTRIC", "MAQUIRENTAS"];
const MAX_FILE = 3.5 * 1024 * 1024;
const MAX_SAP_FILE = 20 * 1024 * 1024;
const PARSER_API = "https://api-parser-pms.onrender.com";

async function validarPmsEnApi(pmsArchivoId) {
  const response = await fetch(`${PARSER_API}/validar-pms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pms_archivo_id: pmsArchivoId,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || `Error ${response.status} validando PMS`);
  }

  return data;
}

async function generarPmsUnicoEnApi({ semana, central }) {
  const response = await fetch(`${PARSER_API}/generar-programa-unico`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      semana,
      central,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || `Error ${response.status} generando PMS único`);
  }

  const blob = await response.blob();

  const contentDisposition = response.headers.get("Content-Disposition") || "";
  const match = contentDisposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
  const filenameFromHeader = match?.[1] ? decodeURIComponent(match[1].replace(/"/g, "")) : null;

  return {
    blob,
    filename: filenameFromHeader,
  };
}


async function generarActaInterferenciasEnApi(payload) {
  const response = await fetch(`${PARSER_API}/generar-acta-interferencias`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || `Error ${response.status} generando acta`);
  }

  const blob = await response.blob();

  const contentDisposition = response.headers.get("Content-Disposition") || "";
  const match = contentDisposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
  const filenameFromHeader = match?.[1] ? decodeURIComponent(match[1].replace(/"/g, "")) : null;

  return {
    blob,
    filename: filenameFromHeader,
  };
}


async function cargarMaestroSapEnApi(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${PARSER_API}/cargar-maestro-sap`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || `Error ${response.status} cargando maestro SAP`);
  }

  return data;
}

async function validarPmsContraSapEnApi({ semana, central }) {
  const response = await fetch(`${PARSER_API}/validar-pms-contra-sap`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ semana, central }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || `Error ${response.status} validando contra SAP`);
  }

  return data;
}

async function validarOtsControlSapEnApi({ password, semana, central, ordenesFile, avisosFile }) {
  const formData = new FormData();
  formData.append("password", password);
  formData.append("semana", semana);
  formData.append("central", central);
  formData.append("file_ordenes", ordenesFile);
  if (avisosFile) formData.append("file_avisos", avisosFile);

  const response = await fetch(`${PARSER_API}/control-sap/validar-ots`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || `Error ${response.status} validando OTs`);
  }

  return data;
}


async function validarMaestrosControlSapEnApi({ semana, central }) {
  const response = await fetch(`${PARSER_API}/control-sap/validar-maestros`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ semana, central }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || `Error ${response.status} validando maestros SAP`);
  }

  return data;
}

async function cargarMaestroOtsControlSapEnApi({ password, file }) {
  const formData = new FormData();
  formData.append("password", password);
  formData.append("file", file);

  const response = await fetch(`${PARSER_API}/control-sap/cargar-maestro-ots`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || `Error ${response.status} cargando maestro de OTs`);
  }

  return data;
}

async function cargarMaestroAvisosControlSapEnApi({ password, file }) {
  const formData = new FormData();
  formData.append("password", password);
  formData.append("file", file);

  const response = await fetch(`${PARSER_API}/control-sap/cargar-maestro-avisos`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || `Error ${response.status} cargando maestro de avisos`);
  }

  return data;
}

async function actualizarOtControlSapEnApi({ password, actividadId, otNueva }) {
  const response = await fetch(`${PARSER_API}/control-sap/actualizar-ot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      password,
      actividad_id: actividadId,
      ot_nueva: otNueva,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || `Error ${response.status} actualizando OT`);
  }

  return data;
}


async function aplicarCambiosControlSapEnApi({ cambios }) {
  const response = await fetch(`${PARSER_API}/control-sap/aplicar-cambios`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cambios,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || `Error ${response.status} aplicando cambios al PMS`);
  }

  return data;
}


// Storage local solo para configuración de empresas y acta.
// Los PMS ya se guardan en Supabase.
const storage = {
  async get(key) {
    const value = localStorage.getItem(key);
    return value ? { value } : null;
  },
  async set(key, value) {
    localStorage.setItem(key, value);
  },
  async delete(key) {
    localStorage.removeItem(key);
  },
  async list(prefix) {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) keys.push(key);
    }
    return { keys };
  },
};

// ─── Semana Sáb–Vie ───
function saturdayOf(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const back = (d.getDay() + 1) % 7;
  d.setDate(d.getDate() - back);
  return d;
}

function nextSaturdayOf(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  // JavaScript: Dom=0, Lun=1, ..., Sáb=6.
  // Para proveedores, la semana objetivo por defecto es el próximo PMS.
  // Si hoy ya es sábado, se usa ese mismo sábado.
  const daysUntilSaturday = (6 - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + daysUntilSaturday);

  return d;
}

function weekInfo(offset) {
  // Offset 0 ya no es la semana operativa actual, sino la próxima semana PMS.
  // Ejemplo: 24/06/2026 -> 27/06/2026 -> PMS 26.
  const start = nextSaturdayOf(new Date());
  start.setDate(start.getDate() + offset * 7);
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
  const id = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
  return { id, dates, start };
}

const fmtDia = (d) => `${d.getDate()} ${MESES[d.getMonth()]}`;

const fmtRango = (w) => `${fmtDia(w.dates[0])} — ${fmtDia(w.dates[6])} ${w.dates[6].getFullYear()}`;

const fmtHora = (ts) => {
  const d = new Date(ts);
  return `${d.getDate()} ${MESES[d.getMonth()]} · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const fmtKB = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);

const fmtFechaPunto = (d = new Date()) => {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
};


function limpiarNombreArchivo(nombre) {
  return String(nombre || "programa.xlsx")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

function limpiarEmpresaPath(nombre) {
  return String(nombre || "EMPRESA")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_-]/g, "_");
}

function normalizarCentral(valor = "") {
  const v = String(valor || "").toUpperCase();

  if (v.includes("SANTA ROSA")) return "SANTA ROSA";
  if (v.includes("VENTANILLA")) return "VENTANILLA";

  return "";
}

function etiquetaCentral(valor = "") {
  const v = normalizarCentral(valor);

  if (v === "SANTA ROSA") return "C. T. Santa Rosa";
  if (v === "VENTANILLA") return "C.C. Ventanilla";

  return "Central no indicada";
}

function getNumeroPms(fechaSemana) {
  const base = fechaSemana instanceof Date ? fechaSemana : new Date(`${fechaSemana}T00:00:00`);

  if (Number.isNaN(base.getTime())) return "";

  const date = new Date(Date.UTC(base.getFullYear(), base.getMonth(), base.getDate()));
  const dayNum = date.getUTCDay() || 7;

  date.setUTCDate(date.getUTCDate() + 4 - dayNum);

  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);

  return weekNo;
}

function BadgePms({ wk, dark = false }) {
  const numero = getNumeroPms(wk?.id || wk?.start);

  if (!numero) return null;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: dark ? C.orange : C.orangeBg,
        color: dark ? C.white : C.orange,
        border: dark ? "none" : `1px solid ${C.orange}`,
        borderRadius: 999,
        padding: "3px 9px",
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: 0.4,
        whiteSpace: "nowrap",
      }}
    >
      PMS {numero}
    </span>
  );
}

// ─── PMS desde Supabase ───
async function listSubs(weekId) {
  const { data, error } = await supabase
    .from("pms_archivos")
    .select("*")
    .eq("semana", weekId)
    .order("fecha_carga", { ascending: true });

  if (error) {
    console.error("Error leyendo pms_archivos:", error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    empresa: row.proveedor || "",
    expositor: row.expositor || "",
    centralPresentada: row.central_presentada || "",
    centralNorm: normalizarCentral(row.central_presentada || ""),
    centralesDetectadas: Array.isArray(row.centrales_detectadas) ? row.centrales_detectadas : [],
    dias: Array.isArray(row.dias) ? row.dias : [],
    presento: Array.isArray(row.presento) ? row.presento : [],
    fileName: row.archivo_nombre || null,
    fileSize: row.file_size || 0,
    fileKey: row.archivo_path || null,
    uploadedAt: row.fecha_carga ? new Date(row.fecha_carga).getTime() : Date.now(),
    estadoValidacion: row.estado_validacion || "PENDIENTE",
    errores: row.errores || 0,
    advertencias: row.advertencias || 0,
    actividades: row.actividades || 0,
    observaciones: row.observaciones || 0,
  }));
}

export default function App() {
  const [tab, setTab] = useState("supervisor");
  const [offset, setOffset] = useState(0);
  const [subs, setSubs] = useState([]);
  const [empresas, setEmpresas] = useState(EMPRESAS_DEFAULT);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [mostrarValidacionOt, setMostrarValidacionOt] = useState(false);
  const [mostrarProgramacionOt, setMostrarProgramacionOt] = useState(false);
  const [centralControlOt, setCentralControlOt] = useState("SANTA ROSA");

  const wk = weekInfo(offset);
  const params = new URLSearchParams(window.location.search);
  const esControlSap = params.get("view") === "control-sap";

  const hoyIdx = (() => {
    if (offset !== 0) return -1;
    const diff = Math.floor((new Date().setHours(0, 0, 0, 0) - wk.start.getTime()) / 86400000);
    return diff >= 0 && diff <= 6 ? diff : -1;
  })();

  const notify = (msg, kind = "ok") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3500);
  };

  const reload = useCallback(async () => {
    setLoading(true);
    setSubs(await listSubs(wk.id));
    setLoading(false);
  }, [wk.id]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    (async () => {
      try {
        const r = await storage.get("config:empresas", true);
        if (r?.value) {
          setEmpresas(JSON.parse(r.value));
        } else {
          await storage.set("config:empresas", JSON.stringify(EMPRESAS_DEFAULT), true);
        }
      } catch {
        try {
          await storage.set("config:empresas", JSON.stringify(EMPRESAS_DEFAULT), true);
        } catch {}
      }
    })();
  }, []);

  const saveEmpresas = async (list) => {
    setEmpresas(list);
    try {
      await storage.set("config:empresas", JSON.stringify(list), true);
    } catch {}
  };

  const updateSub = async (id, mutate) => {
    try {
      const actual = subs.find((x) => x.id === id);
      if (!actual) return;

      const s = {
        ...actual,
        dias: [...(actual.dias || [])],
        presento: [...(actual.presento || [])],
      };

      mutate(s);

      const { error } = await supabase
        .from("pms_archivos")
        .update({
          presento: s.presento,
        })
        .eq("id", id);

      if (error) throw error;

      setSubs((prev) => prev.map((x) => (x.id === id ? s : x)));
    } catch (err) {
      console.error("Error actualizando presentación:", err);
      notify("No se pudo actualizar. Intenta de nuevo.", "err");
    }
  };

  const togglePresento = (id, dayIdx) =>
    updateSub(id, (s) => {
      s.presento = s.presento || [];
      s.presento = s.presento.includes(dayIdx)
        ? s.presento.filter((d) => d !== dayIdx)
        : [...s.presento, dayIdx].sort((a, b) => a - b);
    });

  const deleteSub = async (sub) => {
    if (!window.confirm(`¿Eliminar el registro de ${sub.empresa} (${sub.expositor})?`)) return;

    try {
      if (sub.fileKey) {
        const { error: removeError } = await supabase.storage
          .from("pms-archivos")
          .remove([sub.fileKey]);

        if (removeError) console.warn("No se pudo eliminar archivo del bucket:", removeError);
      }

      const { error } = await supabase
        .from("pms_archivos")
        .delete()
        .eq("id", sub.id);

      if (error) throw error;

      setSubs((prev) => prev.filter((x) => x.id !== sub.id));
      notify("Registro eliminado.");
    } catch (err) {
      console.error("Error eliminando registro:", err);
      notify("No se pudo eliminar.", "err");
    }
  };

  const downloadFile = async (sub) => {
    try {
      if (!sub.fileKey) return notify("Este registro no tiene archivo.", "err");

      const { data, error } = await supabase.storage
        .from("pms-archivos")
        .download(sub.fileKey);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = sub.fileName || "programa.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error descargando archivo:", err);
      notify("No se pudo descargar el archivo.", "err");
    }
  };

  const descargarPmsUnico = async ({ semana, central }) => {
    try {
      notify("Generando PMS único...");

      const { blob, filename } = await generarPmsUnicoEnApi({ semana, central });

      const centralNombre = central === "VENTANILLA" ? "VENTANILLA" : "SANTA_ROSA";
      const nombreFinal =
        filename ||
        `PMS_${getNumeroPms(semana)}_PROGRAMA_UNICO_${centralNombre}_${semana}.xlsx`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = nombreFinal;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);

      notify("PMS único generado correctamente.");
    } catch (err) {
      console.error("Error generando PMS único:", err);
      notify(`No se pudo generar el PMS único: ${err.message || "error desconocido"}`, "err");
    }
  };


  const revalidarSub = async (sub) => {
    if (!sub?.id) return notify("No se encontró el ID del registro.", "err");
    if (!sub?.fileKey) return notify("Este registro no tiene archivo para validar.", "err");

    try {
      notify("Ejecutando validación PMS...");

      await supabase
        .from("pms_archivos")
        .update({
          estado_validacion: "VALIDANDO...",
          errores: 0,
          advertencias: 0,
          actividades: 0,
          observaciones: 0,
        })
        .eq("id", sub.id);

      setSubs((prev) =>
        prev.map((x) =>
          x.id === sub.id
            ? {
                ...x,
                estadoValidacion: "VALIDANDO...",
                errores: 0,
                advertencias: 0,
                actividades: 0,
                observaciones: 0,
              }
            : x
        )
      );

      await validarPmsEnApi(sub.id);
      await reload();

      notify("PMS revalidado correctamente.");
    } catch (err) {
      console.error("Error revalidando PMS:", err);

      await supabase
        .from("pms_archivos")
        .update({
          estado_validacion: "ERROR API - VALIDACIÓN NO EJECUTADA",
          errores: 1,
          advertencias: 0,
        })
        .eq("id", sub.id);

      await reload();

      notify(`No se pudo revalidar: ${err.message || "error desconocido"}`, "err");
    }
  };

  const replaceFileSub = async (sub, file) => {
    if (!sub?.id) return notify("No se encontró el ID del registro.", "err");
    if (!file) return;
    if (file.size > MAX_FILE) return notify(`El archivo supera ${fmtKB(MAX_FILE)}. Reduce su tamaño.`, "err");

    try {
      notify("Reemplazando archivo y ejecutando validación...");

      const empresaLimpia = limpiarEmpresaPath(sub.empresa);
      const nombreLimpio = limpiarNombreArchivo(file.name);
      const nuevoPath = `semana-${wk.id}/${empresaLimpia}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}_${nombreLimpio}`;

      const { error: uploadError } = await supabase.storage
        .from("pms-archivos")
        .upload(nuevoPath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from("pms_archivos")
        .update({
          archivo_nombre: file.name,
          archivo_path: nuevoPath,
          file_size: file.size,
          estado_validacion: "VALIDANDO...",
          errores: 0,
          advertencias: 0,
          actividades: 0,
          observaciones: 0,
        })
        .eq("id", sub.id);

      if (updateError) throw updateError;

      setSubs((prev) =>
        prev.map((x) =>
          x.id === sub.id
            ? {
                ...x,
                fileName: file.name,
                fileSize: file.size,
                fileKey: nuevoPath,
                estadoValidacion: "VALIDANDO...",
                errores: 0,
                advertencias: 0,
                actividades: 0,
                observaciones: 0,
              }
            : x
        )
      );

      await validarPmsEnApi(sub.id);
      await reload();

      notify("Archivo reemplazado y validado correctamente.");
    } catch (err) {
      console.error("Error reemplazando archivo:", err);

      await supabase
        .from("pms_archivos")
        .update({
          estado_validacion: "ERROR API - VALIDACIÓN NO EJECUTADA",
          errores: 1,
          advertencias: 0,
        })
        .eq("id", sub.id);

      await reload();

      notify(`No se pudo reemplazar/validar: ${err.message || "error desconocido"}`, "err");
    }
  };

  if (esControlSap) {
    return <ControlSapPage notify={notify} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: C.cream, fontFamily: FONT, color: C.navy }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@600;700&display=swap');
        button { font-family: inherit; cursor: pointer; }
        input, select, textarea { font-family: inherit; }
        *:focus-visible { outline: 2px solid ${C.orange}; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
      `}</style>

      <header style={{ background: C.navy, color: C.white, padding: "16px 20px" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontFamily: FONT_COND, fontWeight: 700, fontSize: 22, letterSpacing: 1, color: C.orangeLight, textTransform: "uppercase" }}>
              Reunión semanal de proveedores
            </span>
            <span style={{ fontSize: 13, color: "#9AA7B2" }}>Planificación de Mantenimiento · Orygen</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
            <button
              onClick={() => setOffset(offset - 1)}
              aria-label="Semana anterior"
              style={{ background: C.navySoft, color: C.white, border: "none", borderRadius: 6, width: 34, height: 34, fontSize: 16 }}
            >
              ‹
            </button>

            <div style={{ textAlign: "center", minWidth: 250 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ fontFamily: FONT_COND, fontWeight: 700, fontSize: 20, letterSpacing: 0.5 }}>
                  Semana Sáb–Vie
                </div>
                <BadgePms wk={wk} dark />
              </div>

              <div style={{ fontSize: 13, color: "#9AA7B2", marginTop: 2 }}>
                {fmtRango(wk)}
                {offset === 0 && <span style={{ color: C.orangeLight, fontWeight: 600 }}> · próximo</span>}
              </div>
            </div>

            <button
              onClick={() => setOffset(offset + 1)}
              aria-label="Semana siguiente"
              style={{ background: C.navySoft, color: C.white, border: "none", borderRadius: 6, width: 34, height: 34, fontSize: 16 }}
            >
              ›
            </button>

            {offset !== 0 && (
              <button
                onClick={() => setOffset(0)}
                style={{ background: "transparent", color: C.orangeLight, border: `1px solid ${C.orangeLight}`, borderRadius: 6, padding: "6px 10px", fontSize: 13, fontWeight: 600 }}
              >
                PMS próximo
              </button>
            )}
          </div>
        </div>
      </header>

      <nav style={{ background: C.white, borderBottom: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", display: "flex" }}>
          {[
            ["proveedor", "Registrar programa"],
            ["supervisor", "Panel de la reunión"],
            ...(mostrarValidacionOt ? [["control_sap", "Validación de OTs"]] : []),
            ...(mostrarProgramacionOt ? [["control_ot", "Programación semanal OT"]] : []),
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                background: "none",
                border: "none",
                padding: "14px 18px",
                fontSize: 15,
                fontWeight: 600,
                color: tab === key ? C.orange : C.slate,
                borderBottom: tab === key ? `3px solid ${C.orange}` : "3px solid transparent",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      <main style={{ maxWidth: 1040, margin: "0 auto", padding: "20px 16px 60px" }}>
        {tab === "proveedor" ? (
          <FormProveedor
            wk={wk}
            empresas={empresas}
            onSaved={() => {
              reload();
              notify("Programa registrado correctamente.");
              setTab("supervisor");
            }}
            notify={notify}
          />
        ) : tab === "control_sap" ? (
          <ControlSapPage
            notify={notify}
            semanaProp={wk.id}
            centralProp={centralControlOt}
            pmsProp={String(getNumeroPms(wk.id) || "")}
            rangoProp={fmtRango(wk)}
            onVerProgramacionSemanal={() => {
              setMostrarProgramacionOt(true);
              setTab("control_ot");
            }}
          />
        ) : tab === "control_ot" ? (
          <ControlOtSemanal
            wk={wk}
            centralInicial={centralControlOt}
            onGenerarPmsUnico={descargarPmsUnico}
            notify={notify}
          />
        ) : (
          <Panel
            wk={wk}
            subs={subs}
            loading={loading}
            hoyIdx={hoyIdx}
            empresas={empresas}
            onTogglePresento={togglePresento}
            onDelete={deleteSub}
            onDownload={downloadFile}
            onSaveEmpresas={saveEmpresas}
            onGenerarPmsUnico={descargarPmsUnico}
            onOpenControlSap={(central) => {
              setCentralControlOt(central || "SANTA ROSA");
              setMostrarValidacionOt(true);
              setTab("control_sap");
            }}
            onRevalidar={revalidarSub}
            onReplaceFile={replaceFileSub}
            notify={notify}
          />
        )}
      </main>

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: toast.kind === "err" ? C.red : C.navy,
            color: C.white,
            padding: "10px 18px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            zIndex: 50,
            boxShadow: "0 4px 16px rgba(0,0,0,.25)",
          }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── Formulario del proveedor ───
function FormProveedor({ wk, empresas, onSaved, notify }) {
  const [empresa, setEmpresa] = useState("");
  const [otra, setOtra] = useState("");
  const [expositor, setExpositor] = useState("");
  const [central, setCentral] = useState("");
  const [dias, setDias] = useState([]);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const toggleDia = (i) =>
    setDias((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i].sort((a, b) => a - b)));

  const submit = async () => {
    const emp = (empresa === "__otra__" ? otra : empresa).trim();

    if (!emp) return notify("Selecciona o escribe el nombre de la empresa.", "err");
    if (!expositor.trim()) return notify("Escribe el nombre del expositor.", "err");
    if (!central) return notify("Selecciona la central a la que corresponde el programa.", "err");
    if (dias.length === 0) return notify("Marca al menos un día de presencia en planta.", "err");
    if (file && file.size > MAX_FILE) return notify(`El archivo supera ${fmtKB(MAX_FILE)}. Reduce su tamaño.`, "err");

    setSaving(true);

    try {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      let archivoPath = null;
      let archivoNombre = null;
      let archivoSize = 0;

      if (file) {
        const empresaLimpia = limpiarEmpresaPath(emp);
        const nombreLimpio = limpiarNombreArchivo(file.name);

        archivoPath = `semana-${wk.id}/${empresaLimpia}/${id}_${nombreLimpio}`;
        archivoNombre = file.name;
        archivoSize = file.size;

        const { error: uploadError } = await supabase.storage
          .from("pms-archivos")
          .upload(archivoPath, file, {
            cacheControl: "3600",
            upsert: true,
          });

        if (uploadError) throw uploadError;
      }

      const { data: nuevoRegistro, error: insertError } = await supabase
        .from("pms_archivos")
        .insert({
          semana: wk.id,
          proveedor: emp,
          expositor: expositor.trim(),
          central_presentada: central,
          dias,
          presento: [],
          archivo_nombre: archivoNombre,
          archivo_path: archivoPath,
          file_size: archivoSize,
          estado_validacion: file ? "VALIDANDO..." : "SIN ARCHIVO",
          errores: 0,
          advertencias: 0,
          actividades: 0,
          observaciones: 0,
          centrales_detectadas: [],
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      if (file && nuevoRegistro?.id) {
        try {
          notify("Archivo subido. Ejecutando validación automática...");
          await validarPmsEnApi(nuevoRegistro.id);
        } catch (apiError) {
          console.error("Error validando PMS en API:", apiError);

          await supabase
            .from("pms_archivos")
            .update({
              estado_validacion: "ERROR API - VALIDACIÓN NO EJECUTADA",
              errores: 1,
              advertencias: 0,
            })
            .eq("id", nuevoRegistro.id);

          notify("El archivo se subió, pero no se pudo validar automáticamente. Revisa Render/API.", "err");
        }
      }

      setEmpresa("");
      setOtra("");
      setExpositor("");
      setCentral("");
      setDias([]);
      setFile(null);

      onSaved();
    } catch (err) {
      console.error("Error guardando en Supabase:", err);
      notify(`No se pudo guardar: ${err.message || "verifica la conexión"}`, "err");
    } finally {
      setSaving(false);
    }
  };

  const label = {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: C.slate,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  };

  const field = {
    width: "100%",
    padding: "11px 12px",
    border: `1px solid ${C.line}`,
    borderRadius: 8,
    fontSize: 15,
    background: C.white,
    color: C.navy,
    boxSizing: "border-box",
  };

  return (
    <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, padding: 22, maxWidth: 600, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
        <h2 style={{ fontFamily: FONT_COND, fontWeight: 700, fontSize: 22, margin: 0, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Programa semanal
        </h2>
        <BadgePms wk={wk} />
      </div>

      <p style={{ fontSize: 14, color: C.slate, margin: "0 0 20px" }}>
        Semana del {fmtRango(wk)} · PMS {getNumeroPms(wk.id)}. La información registrada es visible para todos los participantes.
      </p>

      <div style={{ marginBottom: 16 }}>
        <label style={label}>Empresa</label>
        <select value={empresa} onChange={(e) => setEmpresa(e.target.value)} style={field}>
          <option value="">Seleccionar…</option>
          {empresas.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
          <option value="__otra__">Otra empresa…</option>
        </select>

        {empresa === "__otra__" && (
          <input
            value={otra}
            onChange={(e) => setOtra(e.target.value)}
            placeholder="Nombre de la empresa"
            style={{ ...field, marginTop: 8 }}
          />
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={label}>Expositor</label>
        <input
          value={expositor}
          onChange={(e) => setExpositor(e.target.value)}
          placeholder="Nombre y apellido"
          style={field}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={label}>Central a presentar</label>
        <select value={central} onChange={(e) => setCentral(e.target.value)} style={field}>
          <option value="">Seleccionar central…</option>
          {CENTRALES.map((c) => (
            <option key={c.value} value={c.label}>
              {c.label}
            </option>
          ))}
        </select>

        <div style={{ fontSize: 12, color: C.slate, marginTop: 6 }}>
          Si el Excel tiene varias hojas, selecciona la central principal a la que corresponde esta presentación.
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={label}>Días en planta (Sáb–Vie)</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
          {DIAS.map((d, i) => {
            const on = dias.includes(i);

            return (
              <button
                key={d}
                onClick={() => toggleDia(i)}
                style={{
                  padding: "9px 0",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  border: on ? `1.5px solid ${C.orange}` : `1.5px solid ${C.line}`,
                  background: on ? C.orange : C.white,
                  color: on ? C.white : C.navy,
                  transition: "all .15s",
                }}
              >
                <div>{d}</div>
                <div style={{ fontSize: 10, fontWeight: 500, opacity: 0.8 }}>{wk.dates[i].getDate()}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: 22 }}>
        <label style={label}>Programa semanal (Excel) — opcional</label>
        <div style={{ position: "relative" }}>
          <div
            style={{
              padding: "16px 12px",
              textAlign: "center",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              border: `1.5px dashed ${file ? C.green : C.orange}`,
              background: file ? C.greenBg : C.white,
              color: file ? C.green : C.orange,
            }}
          >
            {file ? `✓ ${file.name}` : "Tocar aquí para adjuntar el Excel"}
          </div>

          <input
            type="file"
            accept=".xlsx,.xls,.xlsm,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            aria-label="Adjuntar programa en Excel"
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }}
          />
        </div>

        {file ? (
          <div style={{ fontSize: 13, color: C.slate, marginTop: 6 }}>
            {file.name} · {fmtKB(file.size)}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: C.slate, marginTop: 6 }}>
            Si no tienes el archivo a la mano, puedes registrar tu participación ahora y subirlo después en un nuevo registro.
          </div>
        )}
      </div>

      <button
        onClick={submit}
        disabled={saving}
        style={{
          width: "100%",
          padding: "13px 0",
          borderRadius: 8,
          border: "none",
          background: saving ? C.slate : C.orange,
          color: C.white,
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: 0.3,
        }}
      >
        {saving ? "Guardando…" : "Registrar programa"}
      </button>
    </div>
  );
}

// ─── Panel del supervisor ───
function Panel({
  wk,
  subs,
  loading,
  hoyIdx,
  empresas,
  onTogglePresento,
  onDelete,
  onDownload,
  onSaveEmpresas,
  onGenerarPmsUnico,
  onOpenControlSap,
  onRevalidar,
  onReplaceFile,
  notify,
}) {
  const [editEmp, setEditEmp] = useState(false);
  const [nueva, setNueva] = useState("");
  const [filtroCentral, setFiltroCentral] = useState("SANTA ROSA");

  const [obsAbiertas, setObsAbiertas] = useState({});
  const [obsPorArchivo, setObsPorArchivo] = useState({});
  const [obsLoading, setObsLoading] = useState({});
  const [revalidandoId, setRevalidandoId] = useState(null);
  const [reemplazandoId, setReemplazandoId] = useState(null);

  const toggleObservaciones = async (sub) => {
    if (!sub?.id) return;

    if (obsAbiertas[sub.id]) {
      setObsAbiertas((prev) => ({ ...prev, [sub.id]: false }));
      return;
    }

    setObsAbiertas((prev) => ({ ...prev, [sub.id]: true }));

    if (obsPorArchivo[sub.id]) return;

    try {
      setObsLoading((prev) => ({ ...prev, [sub.id]: true }));

      const { data, error } = await supabase
        .from("pms_observaciones")
        .select("*")
        .eq("pms_archivo_id", sub.id)
        .order("fila_excel", { ascending: true });

      if (error) throw error;

      const ordenadas = [...(data || [])].sort((a, b) => {
        const na = a.nivel === "ERROR" ? 0 : 1;
        const nb = b.nivel === "ERROR" ? 0 : 1;
        if (na !== nb) return na - nb;
        return Number(a.fila_excel || 0) - Number(b.fila_excel || 0);
      });

      setObsPorArchivo((prev) => ({ ...prev, [sub.id]: ordenadas }));
    } catch (err) {
      console.error("Error leyendo observaciones:", err);
      notify("No se pudieron cargar las observaciones.", "err");
    } finally {
      setObsLoading((prev) => ({ ...prev, [sub.id]: false }));
    }
  };

  const ejecutarRevalidacion = async (sub) => {
    try {
      setRevalidandoId(sub.id);
      setObsPorArchivo((prev) => ({ ...prev, [sub.id]: null }));
      setObsAbiertas((prev) => ({ ...prev, [sub.id]: false }));
      await onRevalidar(sub);
    } finally {
      setRevalidandoId(null);
    }
  };

  const ejecutarReemplazo = async (sub, file) => {
    try {
      setReemplazandoId(sub.id);
      setObsPorArchivo((prev) => ({ ...prev, [sub.id]: null }));
      setObsAbiertas((prev) => ({ ...prev, [sub.id]: false }));
      await onReplaceFile(sub, file);
    } finally {
      setReemplazandoId(null);
    }
  };


  const visibleSubs = subs.filter((s) => normalizarCentral(s.centralPresentada) === filtroCentral);

  const registraron = new Set(visibleSubs.map((s) => s.empresa.trim().toUpperCase()));
  const conArchivo = new Set(visibleSubs.filter((s) => s.fileKey).map((s) => s.empresa.trim().toUpperCase()));

  const faltantes = empresas.filter((e) => !registraron.has(e.trim().toUpperCase()));
  const sinArchivo = empresas.filter((e) => !conArchivo.has(e.trim().toUpperCase()));

  const totalProg = visibleSubs.reduce((n, s) => n + (s.dias || []).length, 0);
  const totalCumplido = visibleSubs.reduce((n, s) => n + (s.dias || []).filter((d) => (s.presento || []).includes(d)).length, 0);

  const centralActualLabel = CENTRALES.find((c) => c.value === filtroCentral)?.label || "C. T. Santa Rosa";

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: C.slate }}>Cargando registros…</div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <h3 style={{ ...sectionTitle, margin: 0 }}>Filtro de central</h3>
        <BadgePms wk={wk} />
        <span style={{ fontSize: 13, color: C.slate, fontWeight: 600 }}>
          {fmtRango(wk)}
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {CENTRALES.map((c) => (
          <button
            key={c.value}
            onClick={() => setFiltroCentral(c.value)}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              border: filtroCentral === c.value ? `1.5px solid ${C.orange}` : `1.5px solid ${C.line}`,
              background: filtroCentral === c.value ? C.orangeBg : C.white,
              color: filtroCentral === c.value ? C.orange : C.slate,
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        {[
          [`Programas recibidos · ${centralActualLabel}`, visibleSubs.length, C.navy],
          ["Días programados cumplidos", `${totalCumplido} / ${totalProg}`, C.green],
          ["Empresas sin programa subido", sinArchivo.length, sinArchivo.length ? C.red : C.green],
        ].map(([t, v, col]) => (
          <div key={t} style={{ flex: "1 1 150px", background: C.white, border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 16px" }}>
            <div style={{ fontFamily: FONT_COND, fontWeight: 700, fontSize: 26, color: col }}>{v}</div>
            <div style={{ fontSize: 12, color: C.slate, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>{t}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: C.white,
          border: `1px solid ${C.line}`,
          borderRadius: 10,
          padding: "14px 16px",
          marginBottom: 22,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: FONT_COND,
              fontWeight: 700,
              fontSize: 18,
              textTransform: "uppercase",
              letterSpacing: 0.6,
              color: C.navy,
            }}
          >
            PMS {getNumeroPms(wk.id)} · Programa único
          </div>

          <div style={{ fontSize: 13, color: C.slate, marginTop: 2 }}>
            Genera el consolidado de {centralActualLabel} para la semana {fmtRango(wk)}.
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button
            onClick={() => onOpenControlSap?.(filtroCentral)}
            disabled={visibleSubs.length === 0}
            style={{
              background: visibleSubs.length === 0 ? C.slate : C.navy,
              color: C.white,
              border: "none",
              borderRadius: 8,
              padding: "11px 16px",
              fontSize: 14,
              fontWeight: 800,
              whiteSpace: "nowrap",
              opacity: visibleSubs.length === 0 ? 0.65 : 1,
            }}
          >
            Validar OTs SAP
          </button>

          <button
            onClick={() =>
              onGenerarPmsUnico({
                semana: wk.id,
                central: filtroCentral,
              })
            }
            disabled={visibleSubs.length === 0}
            style={{
              background: visibleSubs.length === 0 ? C.slate : C.green,
              color: C.white,
              border: "none",
              borderRadius: 8,
              padding: "11px 16px",
              fontSize: 14,
              fontWeight: 800,
              whiteSpace: "nowrap",
              opacity: visibleSubs.length === 0 ? 0.65 : 1,
            }}
          >
            Descargar PMS único
          </button>
        </div>
      </div>

      <h3 style={sectionTitle}>Matriz semanal · programado vs presentado</h3>

      {visibleSubs.length === 0 ? (
        <Vacio texto={`Aún no hay programas registrados para ${centralActualLabel}.`} />
      ) : (
        <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 10, overflowX: "auto", marginBottom: 8 }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 720, fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ ...thBase, textAlign: "left", position: "sticky", left: 0, background: C.navy, minWidth: 190 }}>Empresa / Expositor</th>
                {DIAS.map((d, i) => (
                  <th key={d} style={{ ...thBase, background: i === hoyIdx ? C.orange : C.navy }}>
                    <div>{d}</div>
                    <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.85 }}>{fmtDia(wk.dates[i])}</div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {visibleSubs.map((s, ri) => (
                <tr key={s.id} style={{ borderTop: `1px solid ${C.line}` }}>
                  <td
                    style={{
                      padding: "10px 12px",
                      position: "sticky",
                      left: 0,
                      background: ri % 2 ? "#FBF8F4" : C.white,
                      borderRight: `1px solid ${C.line}`,
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{s.empresa}</div>
                    <div style={{ fontSize: 12, color: C.slate }}>{s.expositor}</div>
                    <div style={{ fontSize: 11, color: C.orange, marginTop: 2, fontWeight: 700 }}>
                      {etiquetaCentral(s.centralPresentada)}
                    </div>
                    {s.estadoValidacion && (
                      <div style={{ fontSize: 11, color: C.slate, marginTop: 2 }}>
                        Estado: {s.estadoValidacion}
                      </div>
                    )}
                  </td>

                  {DIAS.map((_, di) => {
                    const prog = (s.dias || []).includes(di);
                    const pres = (s.presento || []).includes(di);

                    let bg = ri % 2 ? "#FBF8F4" : C.white;
                    let icon = "";
                    let fg = C.slate;
                    let title = "Sin programación";

                    if (prog && pres) {
                      bg = C.greenBg;
                      icon = "✓";
                      fg = C.green;
                      title = "Programado y presentó — cumplió";
                    } else if (prog && !pres) {
                      bg = C.orangeBg;
                      icon = "●";
                      fg = C.orange;
                      title = "Programado — pendiente de presentar";
                    } else if (!prog && pres) {
                      bg = C.blueBg;
                      icon = "✓";
                      fg = C.blue;
                      title = "Presentó sin haberlo programado";
                    }

                    return (
                      <td key={di} style={{ padding: 0, textAlign: "center", background: bg, borderLeft: `1px solid ${C.line}` }}>
                        <button
                          onClick={() => onTogglePresento(s.id, di)}
                          title={title}
                          style={{
                            width: "100%",
                            minWidth: 56,
                            height: 48,
                            border: "none",
                            background: "transparent",
                            fontSize: 17,
                            fontWeight: 700,
                            color: fg,
                          }}
                        >
                          {icon}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {visibleSubs.length > 0 && (
        <p style={{ fontSize: 13, color: C.slate, margin: "0 0 26px" }}>
          <span style={{ color: C.orange, fontWeight: 700 }}>●</span> Programado, pendiente &nbsp;·&nbsp;
          <span style={{ color: C.green, fontWeight: 700 }}>✓</span> Programado y presentó &nbsp;·&nbsp;
          <span style={{ color: C.blue, fontWeight: 700 }}>✓</span> Presentó sin programar.
          Toca una celda para marcar o desmarcar la presentación de ese día.
        </p>
      )}

      <h3 style={sectionTitle}>Control de entrega del programa</h3>

      <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14, marginBottom: 26 }}>
        <div style={{ fontSize: 13, color: C.slate, marginBottom: 10 }}>
          Mostrando control para: <strong>{centralActualLabel}</strong>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {empresas.map((e) => {
            const key = e.trim().toUpperCase();
            const tieneArchivo = conArchivo.has(key);
            const registro = registraron.has(key);

            const col = tieneArchivo ? C.green : registro ? C.amber : C.red;
            const bg = tieneArchivo ? C.greenBg : registro ? C.amberBg : C.redBg;
            const icon = tieneArchivo ? "✓" : registro ? "⚠" : "✕";

            return (
              <span
                key={e}
                title={tieneArchivo ? "Registró y subió su programa" : registro ? "Registró participación sin archivo" : "No se ha registrado"}
                style={{
                  padding: "6px 12px",
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 600,
                  background: bg,
                  color: col,
                  border: `1px solid ${col}`,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {icon} {e}
                {editEmp && (
                  <button
                    onClick={() => onSaveEmpresas(empresas.filter((x) => x !== e))}
                    style={{ background: "none", border: "none", color: "inherit", fontSize: 14, padding: 0 }}
                  >
                    🗑
                  </button>
                )}
              </span>
            );
          })}
        </div>

        <p style={{ fontSize: 12, color: C.slate, margin: "10px 0 0" }}>
          <span style={{ color: C.green, fontWeight: 700 }}>✓</span> Subió programa &nbsp;·&nbsp;
          <span style={{ color: C.amber, fontWeight: 700 }}>⚠</span> Registró sin archivo &nbsp;·&nbsp;
          <span style={{ color: C.red, fontWeight: 700 }}>✕</span> No registrado
        </p>

        <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => setEditEmp(!editEmp)}
            style={{ background: "none", border: `1px solid ${C.line}`, borderRadius: 6, padding: "5px 10px", fontSize: 13, color: C.slate, fontWeight: 600 }}
          >
            {editEmp ? "Listo" : "Editar lista de empresas"}
          </button>

          {editEmp && (
            <>
              <input
                value={nueva}
                onChange={(e) => setNueva(e.target.value)}
                placeholder="Nueva empresa"
                style={{ padding: "6px 10px", border: `1px solid ${C.line}`, borderRadius: 6, fontSize: 13 }}
              />

              <button
                onClick={() => {
                  const n = nueva.trim().toUpperCase();
                  if (n && !empresas.includes(n)) {
                    onSaveEmpresas([...empresas, n]);
                    setNueva("");
                  }
                }}
                style={{ background: C.navy, color: C.white, border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 13, fontWeight: 600 }}
              >
                Agregar
              </button>
            </>
          )}
        </div>
      </div>

      <h3 style={sectionTitle}>Programas recibidos</h3>

      {visibleSubs.length === 0 ? (
        <Vacio texto={`Los archivos subidos para ${centralActualLabel} aparecerán aquí.`} />
      ) : (
        <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden", marginBottom: 26 }}>
          {visibleSubs.map((s, i) => {
            const obs = obsPorArchivo[s.id] || [];
            const abierto = !!obsAbiertas[s.id];
            const cargandoObs = !!obsLoading[s.id];
            const puedeVerObs = Number(s.observaciones || 0) > 0;

            return (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  gap: 12,
                  padding: "12px 14px",
                  flexWrap: "wrap",
                  borderTop: i > 0 ? `1px solid ${C.line}` : "none",
                }}
              >
                <div style={{ flex: "1 1 460px", minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {s.empresa} <span style={{ fontWeight: 500, color: C.slate }}>· {s.expositor}</span>
                  </div>

                  <div style={{ fontSize: 12, color: C.orange, marginTop: 2, fontWeight: 700 }}>
                    Central declarada: {etiquetaCentral(s.centralPresentada)}
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color: s.fileKey ? C.slate : C.amber,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontWeight: s.fileKey ? 400 : 600,
                      marginTop: 2,
                    }}
                  >
                    {s.fileKey ? `${s.fileName} · ${fmtKB(s.fileSize)}` : "⚠ Sin archivo de programa"} · registrado {fmtHora(s.uploadedAt)}
                  </div>

                  <div style={{ fontSize: 12, color: C.slate, marginTop: 2 }}>
                    Programó: {(s.dias || []).map((d) => DIAS[d]).join(", ")} · Presentó: {(s.presento || []).length ? (s.presento || []).map((d) => DIAS[d]).join(", ") : "—"}
                  </div>

                  <div style={{ fontSize: 12, color: C.slate, marginTop: 2 }}>
                    Validación: {s.estadoValidacion || "PENDIENTE"}
                    {(s.errores || s.advertencias) ? ` · Errores: ${s.errores || 0} · Advertencias: ${s.advertencias || 0}` : ""}
                    {(s.actividades || s.observaciones) ? ` · Actividades: ${s.actividades || 0} · Observaciones: ${s.observaciones || 0}` : ""}
                  </div>

                  {puedeVerObs && (
                    <button
                      onClick={() => toggleObservaciones(s)}
                      style={{
                        marginTop: 10,
                        background: abierto ? C.navy : C.white,
                        color: abierto ? C.white : C.navy,
                        border: `1px solid ${C.line}`,
                        borderRadius: 6,
                        padding: "7px 12px",
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      {abierto ? "Ocultar observaciones" : "Ver observaciones"}
                    </button>
                  )}

                  {abierto && (
                    <ObservacionesBox
                      observaciones={obs}
                      loading={cargandoObs}
                      total={s.observaciones || 0}
                    />
                  )}
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end", flex: "0 0 auto" }}>
                  {s.fileKey && (
                    <button
                      onClick={() => ejecutarRevalidacion(s)}
                      disabled={revalidandoId === s.id || reemplazandoId === s.id}
                      title="Vuelve a ejecutar la validación sobre el Excel ya subido"
                      style={{
                        background: revalidandoId === s.id ? C.slate : C.green,
                        color: C.white,
                        border: "none",
                        borderRadius: 6,
                        padding: "8px 12px",
                        fontSize: 13,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {revalidandoId === s.id ? "Revalidando..." : "Revalidar archivo actual"}
                    </button>
                  )}

                  <label
                    title="Sube una nueva versión del Excel manteniendo el mismo registro"
                    style={{
                      background: reemplazandoId === s.id ? C.slate : C.orange,
                      color: C.white,
                      border: "none",
                      borderRadius: 6,
                      padding: "8px 12px",
                      fontSize: 13,
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                      cursor: reemplazandoId === s.id ? "not-allowed" : "pointer",
                      opacity: reemplazandoId === s.id ? 0.75 : 1,
                    }}
                  >
                    {reemplazandoId === s.id ? "Reemplazando..." : "Reemplazar archivo"}
                    <input
                      type="file"
                      accept=".xlsx,.xls,.xlsm,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                      disabled={reemplazandoId === s.id || revalidandoId === s.id}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (f) ejecutarReemplazo(s, f);
                      }}
                      style={{ display: "none" }}
                    />
                  </label>

                  {s.fileKey && (
                    <button
                      onClick={() => onDownload(s)}
                      style={{ background: C.navy, color: C.white, border: "none", borderRadius: 6, padding: "8px 12px", fontSize: 13, fontWeight: 700 }}
                    >
                      Descargar
                    </button>
                  )}

                  <button
                    onClick={() => onDelete(s)}
                    style={{ background: "none", color: C.red, border: `1px solid ${C.red}`, borderRadius: 6, padding: "8px 12px", fontSize: 13, fontWeight: 700 }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AbrirControlSapSection
        wk={wk}
        filtroCentral={filtroCentral}
        centralActualLabel={centralActualLabel}
        onOpenControlSap={onOpenControlSap}
      />

      <ActaSection wk={wk} subs={visibleSubs} empresas={empresas} faltantes={faltantes} centralActualLabel={centralActualLabel} filtroCentral={filtroCentral} notify={notify} />
    </div>
  );
}


function inferirEspecialidadControlOt(row) {
  const inspector = String(row?.inspector || "").toUpperCase();
  const texto = `${row?.actividad || ""} ${row?.sistema || ""} ${row?.equipo || ""}`.toUpperCase();

  if (/(M\.CASTILLO|R\.SANDOVAL|FERNANDO SARMIENTO|E\.SALINAS|ELECTR|MOTOR|TABLERO|REL[EÉ]|CABLE|LUMINARIA|MCC|UPS|BATER[IÍ]A)/.test(inspector + " " + texto)) {
    return "ELE";
  }

  if (/(M\.TASAYCO|P\.GARCIA|C\.HUAYNATE|C\.ESPINOZA|M\.GOMEZ|V\.ESPIRITU|INSTR|CONTROL|PLC|TRANSMISOR|PRESSURE|SWITCH|V[ÁA]LVULA DE CONTROL|SE[ÑN]AL)/.test(inspector + " " + texto)) {
    return "I&C";
  }

  if (/(C\.LUQUE|J\.CACERES|F\.CASTRO|D\.HINOSTROZA|F\.ROJAS|MEC|BOMBA|V[ÁA]LVULA|ACOPLE|TUBER[IÍ]A|COMPRESOR|MONTAJE)/.test(inspector + " " + texto)) {
    return "MEC";
  }

  return "—";
}

function fmtFechaControlOt(valor) {
  if (!valor) return "";
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return `${String(valor.getDate()).padStart(2, "0")}/${String(valor.getMonth() + 1).padStart(2, "0")}/${String(valor.getFullYear()).slice(-2)}`;
  }
  return String(valor);
}

function fechasProgramadasControlOt(row, wk) {
  const dias = Array.isArray(row?.dias) ? row.dias : [];
  if (!dias.length) return "";

  return dias
    .map((idx) => {
      const d = wk?.dates?.[Number(idx)];
      return d ? fmtFechaControlOt(d) : "";
    })
    .filter(Boolean)
    .join(", ");
}

async function guardarControlOtRow(payload, existenteId = null) {
  if (existenteId) {
    const { data, error } = await supabase
      .from("pms_control_ot_semanal")
      .update(payload)
      .eq("id", existenteId)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("pms_control_ot_semanal")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

function ControlOtSemanal({ wk, centralInicial = "SANTA ROSA", onGenerarPmsUnico, notify }) {
  const [filtroCentral, setFiltroCentral] = useState(centralInicial || "SANTA ROSA");
  const [actividades, setActividades] = useState([]);
  const [controles, setControles] = useState([]);
  const [sapOrdenes, setSapOrdenes] = useState({});
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const centralActualLabel = CENTRALES.find((c) => c.value === filtroCentral)?.label || "C. T. Santa Rosa";

  const cargarControlOt = useCallback(async () => {
    setLoading(true);

    try {
      const { data: acts, error: actError } = await supabase
        .from("pms_actividades")
        .select("*")
        .eq("semana", wk.id)
        .order("proveedor", { ascending: true })
        .order("fila_excel", { ascending: true });

      if (actError) throw actError;

      const filtradas = (acts || [])
        .filter((a) => normalizarCentral(a.central) === filtroCentral)
        .filter((a) => String(a.ot_grafo || "").trim())
        .map((a) => ({
          ...a,
          orden_control: String(a.ot_grafo || "").trim(),
          aviso_control: String(a.cod_pm_aviso || "").trim(),
          descripcion_control: String(a.actividad || "").trim(),
          unidad_control: String(a.unidad || "").trim(),
          especialidad_control: inferirEspecialidadControlOt(a),
          fecha_programada_control: fechasProgramadasControlOt(a, wk),
        }));

      const ordenes = Array.from(new Set(filtradas.map((a) => a.orden_control).filter(Boolean)));

      let mapaSap = {};
      if (ordenes.length) {
        const { data: sapRows, error: sapError } = await supabase
          .from("sap_ordenes_avisos")
          .select("*")
          .in("numero_ot", ordenes);

        if (!sapError) {
          mapaSap = (sapRows || []).reduce((acc, row) => {
            if (row.numero_ot) acc[String(row.numero_ot)] = row;
            return acc;
          }, {});
        }
      }

      const { data: ctrlRows, error: ctrlError } = await supabase
        .from("pms_control_ot_semanal")
        .select("*")
        .eq("semana", wk.id)
        .eq("central", filtroCentral)
        .order("fecha_registro", { ascending: true });

      if (ctrlError) throw ctrlError;

      setActividades(filtradas);
      setSapOrdenes(mapaSap);
      setControles(ctrlRows || []);
    } catch (err) {
      console.error("Error cargando programación semanal OT:", err);
      notify?.(`No se pudo cargar la programación OT: ${err.message || "error desconocido"}`, "err");
    } finally {
      setLoading(false);
    }
  }, [wk.id, wk.dates, filtroCentral, notify]);

  useEffect(() => {
    cargarControlOt();
  }, [cargarControlOt]);

  const controlPorActividad = controles.reduce((acc, row) => {
    if (row.actividad_id) acc[row.actividad_id] = row;
    return acc;
  }, {});

  const adicionales = controles.filter((row) => row.es_adicional);

  const visible = actividades.filter((a) => {
    const q = busqueda.trim().toUpperCase();
    if (!q) return true;

    return [
      a.orden_control,
      a.aviso_control,
      a.descripcion_control,
      a.unidad_control,
      a.especialidad_control,
      sapOrdenes[a.orden_control]?.estado_control,
      sapOrdenes[a.orden_control]?.estado_orden,
    ]
      .join(" ")
      .toUpperCase()
      .includes(q);
  });

  const actualizarCampoBase = async (actividad, patch) => {
    const actual = controlPorActividad[actividad.id];
    const sap = sapOrdenes[actividad.orden_control] || {};
    const payload = {
      semana: wk.id,
      central: filtroCentral,
      actividad_id: actividad.id,
      orden: actividad.orden_control,
      descripcion: actividad.descripcion_control,
      aviso: actividad.aviso_control,
      unidad: actividad.unidad_control,
      especialidad: actividad.especialidad_control,
      fecha_programada: actividad.fecha_programada_control,
      situacion: sap.estado_control || sap.estado_orden || "",
      es_adicional: false,
      marca: actual?.marca || "",
      nota: actual?.nota || "",
      ...patch,
    };

    try {
      setSavingId(actividad.id);
      const guardado = await guardarControlOtRow(payload, actual?.id || null);
      setControles((prev) => {
        const sinAnterior = prev.filter((r) => r.id !== guardado.id && r.actividad_id !== actividad.id);
        return [...sinAnterior, guardado];
      });
      notify?.("Control OT actualizado.");
    } catch (err) {
      console.error("Error guardando control OT:", err);
      notify?.(`No se pudo guardar el control OT: ${err.message || "error desconocido"}`, "err");
    } finally {
      setSavingId(null);
    }
  };

  const agregarAdicional = async () => {
    try {
      const payload = {
        semana: wk.id,
        central: filtroCentral,
        actividad_id: null,
        orden: "",
        aviso: "",
        descripcion: "",
        unidad: "",
        especialidad: "",
        fecha_programada: "",
        situacion: "",
        marca: "",
        nota: "",
        es_adicional: true,
      };

      const guardado = await guardarControlOtRow(payload);
      setControles((prev) => [...prev, guardado]);
      notify?.("Fila adicional agregada.");
    } catch (err) {
      console.error("Error agregando fila adicional:", err);
      notify?.(`No se pudo agregar la fila: ${err.message || "error desconocido"}`, "err");
    }
  };

  const actualizarAdicional = async (row, patch) => {
    const payload = { ...patch };

    try {
      setSavingId(row.id);
      const guardado = await guardarControlOtRow(payload, row.id);
      setControles((prev) => prev.map((r) => (r.id === row.id ? guardado : r)));
    } catch (err) {
      console.error("Error actualizando adicional:", err);
      notify?.(`No se pudo guardar la fila adicional: ${err.message || "error desconocido"}`, "err");
    } finally {
      setSavingId(null);
    }
  };

  const eliminarAdicional = async (row) => {
    if (!window.confirm("¿Eliminar esta actividad adicional?")) return;

    try {
      const { error } = await supabase
        .from("pms_control_ot_semanal")
        .delete()
        .eq("id", row.id);

      if (error) throw error;
      setControles((prev) => prev.filter((r) => r.id !== row.id));
      notify?.("Actividad adicional eliminada.");
    } catch (err) {
      console.error("Error eliminando adicional:", err);
      notify?.(`No se pudo eliminar: ${err.message || "error desconocido"}`, "err");
    }
  };

  const marcaBtn = (label, value, current, onClick) => (
    <button
      onClick={onClick}
      style={{
        padding: "7px 9px",
        border: `1px solid ${current === value ? C.green : C.line}`,
        background: current === value ? C.green : C.white,
        color: current === value ? C.white : C.slate,
        fontWeight: 800,
        borderRadius: 7,
        fontSize: 12,
      }}
    >
      {label}
    </button>
  );

  const inputCell = {
    width: "100%",
    boxSizing: "border-box",
    border: `1px solid ${C.line}`,
    borderRadius: 6,
    padding: "8px 9px",
    fontSize: 13,
    color: C.navy,
    background: C.white,
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <h3 style={{ ...sectionTitle, margin: 0 }}>Programación semanal de OT</h3>
        <BadgePms wk={wk} />
        <span style={{ fontSize: 13, color: C.slate, fontWeight: 600 }}>{fmtRango(wk)}</span>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {CENTRALES.map((c) => (
          <button
            key={c.value}
            onClick={() => setFiltroCentral(c.value)}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              border: filtroCentral === c.value ? `1.5px solid ${C.orange}` : `1.5px solid ${C.line}`,
              background: filtroCentral === c.value ? C.orangeBg : C.white,
              color: filtroCentral === c.value ? C.orange : C.slate,
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div
        style={{
          background: C.white,
          border: `1px solid ${C.line}`,
          borderRadius: 10,
          padding: "14px 16px",
          marginBottom: 18,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontFamily: FONT_COND, fontWeight: 700, fontSize: 18, textTransform: "uppercase", letterSpacing: 0.6 }}>
            Control de cumplimiento · {centralActualLabel}
          </div>
          <div style={{ fontSize: 13, color: C.slate, marginTop: 3 }}>
            Registra avance real del PMS: final, parcial, pendiente o actividades adicionales.
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={cargarControlOt}
            style={{
              background: C.navy,
              color: C.white,
              border: "none",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            Actualizar tabla
          </button>

          <button
            onClick={() => onGenerarPmsUnico?.({ semana: wk.id, central: filtroCentral })}
            style={{
              background: C.green,
              color: C.white,
              border: "none",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            Descargar PMS único
          </button>
        </div>
      </div>

      <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 10, padding: 12, marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar orden, descripción, unidad, especialidad..."
            style={{
              flex: "1 1 260px",
              border: `1px solid ${C.line}`,
              borderRadius: 7,
              padding: "10px 12px",
              fontSize: 14,
            }}
          />

          <span style={{ fontSize: 13, color: C.slate, fontWeight: 700 }}>
            {visible.length} OT visibles · {adicionales.length} adicionales
          </span>
        </div>
      </div>

      {loading ? (
        <Vacio texto="Cargando programación semanal de OT..." />
      ) : (
        <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 10, overflowX: "auto", marginBottom: 18 }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 1320, fontSize: 13 }}>
            <thead>
              <tr>
                {["Orden", "Aviso", "Descripción", "Unidad", "Especialidad", "Fecha programada", "Situación", "Mi marca", "Nota"].map((h) => (
                  <th
                    key={h}
                    style={{
                      background: C.navy,
                      color: C.white,
                      padding: "9px 10px",
                      textAlign: "left",
                      fontFamily: FONT_COND,
                      fontSize: 14,
                      letterSpacing: 0.4,
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {visible.map((a) => {
                const ctrl = controlPorActividad[a.id] || {};
                const sap = sapOrdenes[a.orden_control] || {};
                const situacion = ctrl.situacion || sap.estado_control || sap.estado_orden || "—";
                const marca = ctrl.marca || "";
                const nota = ctrl.nota || "";
                const saving = savingId === a.id;

                return (
                  <tr key={a.id} style={{ borderTop: `1px solid ${C.line}`, opacity: saving ? 0.65 : 1 }}>
                    <td style={{ padding: 10, fontWeight: 800, verticalAlign: "top" }}>{a.orden_control}</td>
                    <td style={{ padding: 10, fontWeight: 800, verticalAlign: "top" }}>{a.aviso_control || "—"}</td>
                    <td style={{ padding: 10, minWidth: 260, verticalAlign: "top" }}>
                      {a.descripcion_control || "—"}
                      {a.proveedor && <div style={{ color: C.slate, fontSize: 12, marginTop: 3 }}>{a.proveedor}</div>}
                    </td>
                    <td style={{ padding: 10, verticalAlign: "top" }}>{a.unidad_control || "—"}</td>
                    <td style={{ padding: 10, verticalAlign: "top" }}>{a.especialidad_control || "—"}</td>
                    <td style={{ padding: 10, verticalAlign: "top" }}>{a.fecha_programada_control || "—"}</td>
                    <td style={{ padding: 10, verticalAlign: "top" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 8px",
                          borderRadius: 999,
                          background: /CERR|MECE/i.test(String(situacion)) ? C.redBg : C.greenBg,
                          color: /CERR|MECE/i.test(String(situacion)) ? C.red : C.green,
                          fontWeight: 800,
                          fontSize: 12,
                        }}
                      >
                        {situacion}
                      </span>
                    </td>
                    <td style={{ padding: 10, minWidth: 185, verticalAlign: "top" }}>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {marcaBtn("Final", "FINAL", marca, () => actualizarCampoBase(a, { marca: "FINAL" }))}
                        {marcaBtn("Parc", "PARCIAL", marca, () => actualizarCampoBase(a, { marca: "PARCIAL" }))}
                        {marcaBtn("—", "", marca, () => actualizarCampoBase(a, { marca: "" }))}
                      </div>
                    </td>
                    <td style={{ padding: 10, minWidth: 260, verticalAlign: "top" }}>
                      <textarea
                        defaultValue={nota}
                        placeholder="Describe lo ejecutado, pendiente o interferencias..."
                        onBlur={(e) => actualizarCampoBase(a, { nota: e.target.value })}
                        rows={2}
                        style={{ ...inputCell, resize: "vertical" }}
                      />
                    </td>
                  </tr>
                );
              })}

              {adicionales.map((row) => (
                <tr key={row.id} style={{ borderTop: `1px solid ${C.line}`, background: "#FFFCF8" }}>
                  <td style={{ padding: 10, verticalAlign: "top" }}>
                    <input
                      defaultValue={row.orden || ""}
                      onBlur={(e) => actualizarAdicional(row, { orden: e.target.value })}
                      style={inputCell}
                      placeholder="OT/Aviso"
                    />
                  </td>
                  <td style={{ padding: 10, verticalAlign: "top" }}>
                    <input
                      defaultValue={row.aviso || ""}
                      onBlur={(e) => actualizarAdicional(row, { aviso: e.target.value })}
                      style={inputCell}
                      placeholder="Aviso/COD PM"
                    />
                  </td>
                  <td style={{ padding: 10, verticalAlign: "top" }}>
                    <textarea
                      defaultValue={row.descripcion || ""}
                      onBlur={(e) => actualizarAdicional(row, { descripcion: e.target.value })}
                      rows={2}
                      style={{ ...inputCell, resize: "vertical" }}
                      placeholder="Actividad adicional"
                    />
                  </td>
                  <td style={{ padding: 10, verticalAlign: "top" }}>
                    <input
                      defaultValue={row.unidad || ""}
                      onBlur={(e) => actualizarAdicional(row, { unidad: e.target.value })}
                      style={inputCell}
                      placeholder="TG7"
                    />
                  </td>
                  <td style={{ padding: 10, verticalAlign: "top" }}>
                    <input
                      defaultValue={row.especialidad || ""}
                      onBlur={(e) => actualizarAdicional(row, { especialidad: e.target.value })}
                      style={inputCell}
                      placeholder="ELE/MEC/I&C"
                    />
                  </td>
                  <td style={{ padding: 10, verticalAlign: "top" }}>
                    <input
                      defaultValue={row.fecha_programada || ""}
                      onBlur={(e) => actualizarAdicional(row, { fecha_programada: e.target.value })}
                      style={inputCell}
                      placeholder="dd/mm/aa"
                    />
                  </td>
                  <td style={{ padding: 10, verticalAlign: "top" }}>
                    <input
                      defaultValue={row.situacion || ""}
                      onBlur={(e) => actualizarAdicional(row, { situacion: e.target.value })}
                      style={inputCell}
                      placeholder="Abierta/Cerrada"
                    />
                  </td>
                  <td style={{ padding: 10, minWidth: 185, verticalAlign: "top" }}>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {marcaBtn("Final", "FINAL", row.marca || "", () => actualizarAdicional(row, { marca: "FINAL" }))}
                      {marcaBtn("Parc", "PARCIAL", row.marca || "", () => actualizarAdicional(row, { marca: "PARCIAL" }))}
                      {marcaBtn("—", "", row.marca || "", () => actualizarAdicional(row, { marca: "" }))}
                    </div>
                  </td>
                  <td style={{ padding: 10, minWidth: 300, verticalAlign: "top" }}>
                    <textarea
                      defaultValue={row.nota || ""}
                      onBlur={(e) => actualizarAdicional(row, { nota: e.target.value })}
                      rows={2}
                      style={{ ...inputCell, resize: "vertical" }}
                      placeholder="Nota de ejecución"
                    />
                    <button
                      onClick={() => eliminarAdicional(row)}
                      style={{
                        marginTop: 8,
                        background: "transparent",
                        color: C.red,
                        border: `1px solid ${C.red}`,
                        borderRadius: 6,
                        padding: "6px 10px",
                        fontWeight: 800,
                      }}
                    >
                      Eliminar fila
                    </button>
                  </td>
                </tr>
              ))}

              {visible.length === 0 && adicionales.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: 22, color: C.slate, textAlign: "center" }}>
                    No hay actividades con OT para {centralActualLabel}. Descarga o valida el PMS único antes de revisar esta tabla.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={agregarAdicional}
          style={{
            background: C.orange,
            color: C.white,
            border: "none",
            borderRadius: 8,
            padding: "11px 16px",
            fontSize: 14,
            fontWeight: 800,
          }}
        >
          + Agregar actividad adicional
        </button>
      </div>
    </div>
  );
}



function ObservacionesBox({ observaciones, loading, total }) {
  if (loading) {
    return (
      <div style={{ marginTop: 12, border: `1px solid ${C.line}`, borderRadius: 8, padding: 12, fontSize: 13, color: C.slate }}>
        Cargando observaciones...
      </div>
    );
  }

  if (!observaciones || observaciones.length === 0) {
    return (
      <div style={{ marginTop: 12, border: `1px solid ${C.line}`, borderRadius: 8, padding: 12, fontSize: 13, color: C.slate }}>
        No se encontraron observaciones detalladas para este archivo.
      </div>
    );
  }

  const errores = observaciones.filter((o) => o.nivel === "ERROR").length;
  const advertencias = observaciones.filter((o) => o.nivel === "ADVERTENCIA").length;
  const filas = new Set(observaciones.map((o) => o.fila_excel).filter(Boolean));

  const resumen = Object.entries(
    observaciones.reduce((acc, o) => {
      const k = o.tipo_observacion || "Observación";
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");

  const ots = Array.from(
    new Set(
      observaciones
        .filter((o) => String(o.campo || "").includes("ot") && o.valor_detectado)
        .map((o) => o.valor_detectado)
    )
  ).slice(0, 8);

  return (
    <div
      style={{
        marginTop: 12,
        border: `1px solid ${C.line}`,
        borderRadius: 10,
        padding: 12,
        background: "#FFFCF8",
        maxWidth: "100%",
        overflowX: "auto",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8, marginBottom: 12 }}>
        {[
          ["Observado", "Estado", C.red],
          [errores, "Errores", errores ? C.red : C.green],
          [advertencias, "Advertencias", advertencias ? C.amber : C.green],
          [filas.size, "Filas observadas", C.navy],
        ].map(([v, t, col]) => (
          <div key={t} style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: "9px 10px", background: C.white }}>
            <div style={{ fontFamily: FONT_COND, fontWeight: 700, fontSize: 20, color: col }}>{v}</div>
            <div style={{ fontSize: 11, color: C.slate, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>{t}</div>
          </div>
        ))}
      </div>

      {resumen && (
        <div style={{ fontSize: 13, marginBottom: 8 }}>
          <strong>Resumen:</strong> {resumen}
        </div>
      )}

      {ots.length > 0 && (
        <div style={{ fontSize: 13, marginBottom: 10 }}>
          <strong>OTs observadas:</strong> {ots.join(", ")}
        </div>
      )}

      <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 760, fontSize: 12 }}>
        <thead>
          <tr>
            {["Nivel", "Fila", "Observación", "Actividad", "Valor detectado", "Sugerencia"].map((h) => (
              <th
                key={h}
                style={{
                  background: C.navy,
                  color: C.white,
                  padding: "8px 9px",
                  textAlign: "left",
                  fontFamily: FONT_COND,
                  fontSize: 13,
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {observaciones.slice(0, 12).map((o, idx) => {
            const isError = o.nivel === "ERROR";

            return (
              <tr key={`${o.fila_excel}-${o.campo}-${idx}`} style={{ borderTop: `1px solid ${C.line}` }}>
                <td style={{ padding: 8, verticalAlign: "top" }}>
                  <span
                    style={{
                      display: "inline-block",
                      border: `1px solid ${isError ? C.red : C.amber}`,
                      color: isError ? C.red : C.amber,
                      borderRadius: 999,
                      padding: "2px 8px",
                      fontWeight: 800,
                      fontSize: 11,
                    }}
                  >
                    {o.nivel || "OBS"}
                  </span>
                </td>
                <td style={{ padding: 8, verticalAlign: "top" }}>{o.fila_excel || "—"}</td>
                <td style={{ padding: 8, verticalAlign: "top", fontWeight: 700 }}>
                  {o.tipo_observacion || "Observación"}
                  {o.campo && <div style={{ fontWeight: 400, color: C.slate, marginTop: 3 }}>Campo: {o.campo}</div>}
                </td>
                <td style={{ padding: 8, verticalAlign: "top" }}>
                  {o.actividad || "—"}
                  {o.unidad && <div style={{ color: C.slate, marginTop: 3 }}>Unidad: {o.unidad}</div>}
                </td>
                <td style={{ padding: 8, verticalAlign: "top" }}>{o.valor_detectado || "—"}</td>
                <td style={{ padding: 8, verticalAlign: "top" }}>{o.sugerencia || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {total > 12 && (
        <div style={{ marginTop: 8, fontSize: 12, color: C.slate }}>
          Mostrando las primeras 12 observaciones de {total}.
        </div>
      )}
    </div>
  );
}




function AbrirControlSapSection({ wk, filtroCentral, centralActualLabel, onOpenControlSap }) {
  const abrir = () => {
    onOpenControlSap?.(filtroCentral);
  };

  return (
    <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 10, padding: "14px 16px", marginBottom: 26, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <div>
        <div style={{ fontFamily: FONT_COND, fontWeight: 700, fontSize: 18, textTransform: "uppercase", letterSpacing: 0.6, color: C.navy }}>
          Control SAP OT/Avisos
        </div>
        <div style={{ fontSize: 13, color: C.slate, marginTop: 2 }}>
          Valida las OTs, avisos y pedidos del PMS {getNumeroPms(wk.id)} de {centralActualLabel}.
        </div>
      </div>
      <button
        onClick={abrir}
        style={{ background: C.navy, color: C.white, border: "none", borderRadius: 8, padding: "11px 16px", fontSize: 14, fontWeight: 800, whiteSpace: "nowrap" }}
      >
        Validar OTs SAP
      </button>
    </div>
  );
}

function ControlSapPage({ notify, semanaProp, centralProp, pmsProp, rangoProp, onVerProgramacionSemanal }) {
  const params = new URLSearchParams(window.location.search);
  const semana = semanaProp || params.get("semana") || "";
  const central = centralProp || params.get("central") || "SANTA ROSA";
  const pms = pmsProp || params.get("pms") || "";
  const rango = rangoProp || params.get("rango") || semana;
  const embebido = Boolean(semanaProp);

  const [validando, setValidando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [manualPorFila, setManualPorFila] = useState({});
  const [cambiosPreparados, setCambiosPreparados] = useState([]);
  const [mostrarOk, setMostrarOk] = useState(false);
  const [localToast, setLocalToast] = useState(null);

  const [adminPassword, setAdminPassword] = useState("");
  const [adminOrdenesFile, setAdminOrdenesFile] = useState(null);
  const [adminAvisosFile, setAdminAvisosFile] = useState(null);
  const [cargandoOts, setCargandoOts] = useState(false);
  const [cargandoAvisos, setCargandoAvisos] = useState(false);
  const [adminResumen, setAdminResumen] = useState(null);
  const [aplicandoCambios, setAplicandoCambios] = useState(false);
  const [cambiosAplicados, setCambiosAplicados] = useState(false);
  const [descargandoPmsControl, setDescargandoPmsControl] = useState(false);

  const avisar = (msg, kind = "ok") => {
    if (notify) notify(msg, kind);
    setLocalToast({ msg, kind });
    setTimeout(() => setLocalToast(null), 3500);
  };

  const filaKey = (fila, idx = 0) =>
    String(fila?.actividad_id || `${fila?.empresa || ""}-${fila?.fila_excel || ""}-${fila?.numero_pms || ""}-${idx}`);

  const validarConMaestros = useCallback(async () => {
    if (!semana) return;
    try {
      setValidando(true);
      setCambiosPreparados([]);
      setCambiosAplicados(false);
      setMostrarOk(false);
      const data = await validarMaestrosControlSapEnApi({ semana, central });
      setResultado(data);
    } catch (err) {
      console.error("Error validando con maestros SAP:", err);
      setResultado(null);
      avisar(`No se pudo validar con maestros SAP: ${err.message || "error desconocido"}`, "err");
    } finally {
      setValidando(false);
    }
  }, [semana, central]);

  useEffect(() => {
    validarConMaestros();
  }, [validarConMaestros]);

  const cargarMaestroOts = async () => {
    if (!adminPassword.trim()) return avisar("Ingresa la clave de administrador SAP.", "err");
    if (!adminOrdenesFile) return avisar("Selecciona el Excel SAP de OTs.", "err");
    if (adminOrdenesFile.size > MAX_SAP_FILE) return avisar(`El archivo de OTs supera ${fmtKB(MAX_SAP_FILE)}.`, "err");

    try {
      setCargandoOts(true);
      avisar("Cargando maestro de OTs...");
      const data = await cargarMaestroOtsControlSapEnApi({ password: adminPassword, file: adminOrdenesFile });
      setAdminResumen((prev) => ({ ...(prev || {}), ots: data }));
      avisar("Maestro de OTs cargado. Revalidando...");
      await validarConMaestros();
    } catch (err) {
      console.error("Error cargando maestro de OTs:", err);
      avisar(`No se pudo cargar maestro de OTs: ${err.message || "error desconocido"}`, "err");
    } finally {
      setCargandoOts(false);
    }
  };

  const cargarMaestroAvisos = async () => {
    if (!adminPassword.trim()) return avisar("Ingresa la clave de administrador SAP.", "err");
    if (!adminAvisosFile) return avisar("Selecciona el Excel SAP de Avisos.", "err");
    if (adminAvisosFile.size > MAX_SAP_FILE) return avisar(`El archivo de avisos supera ${fmtKB(MAX_SAP_FILE)}.`, "err");

    try {
      setCargandoAvisos(true);
      avisar("Cargando maestro de avisos...");
      const data = await cargarMaestroAvisosControlSapEnApi({ password: adminPassword, file: adminAvisosFile });
      setAdminResumen((prev) => ({ ...(prev || {}), avisos: data }));
      avisar("Maestro de avisos cargado. Revalidando...");
      await validarConMaestros();
    } catch (err) {
      console.error("Error cargando maestro de avisos:", err);
      avisar(`No se pudo cargar maestro de avisos: ${err.message || "error desconocido"}`, "err");
    } finally {
      setCargandoAvisos(false);
    }
  };

  const prepararCambio = (fila, accion, otFinalEntrada) => {
    const key = filaKey(fila);
    const otLimpia = String(otFinalEntrada || "").trim();

    if (accion !== "MANTENER" && !otLimpia) {
      return avisar("Ingresa una OT o usa Mantener sin cambiar.", "err");
    }

    const pedidoDetectado =
      fila.pedido_detectado ||
      fila.pedido_sugerido ||
      (/^(3500|4500)\d+/i.test(String(fila.numero_pms || "")) ? fila.numero_pms : "") ||
      "";

    const estadoFila = String(fila.estado || "").toUpperCase();
    const esAvisoSinOt = estadoFila === "AVISO_SIN_OT";
    const esAvisoNoOperativo = estadoFila === "AVISO_NO_OPERATIVO";

    const codPmSugerido = esAvisoNoOperativo
      ? ""
      : (
        fila.cod_pm_sugerido ||
        fila.cod_pm_sap ||
        fila.aviso_sap ||
        fila.aviso_pms ||
        fila.plan_pm_sap ||
        ""
      );

    const accionFinal =
      esAvisoNoOperativo && accion === "MANTENER"
        ? "AVISO NO OPERATIVO"
        : esAvisoSinOt && accion === "MANTENER"
          ? "AVISO SIN OT"
          : accion;

    const otFinal =
      (esAvisoSinOt || esAvisoNoOperativo) && accion === "MANTENER"
        ? ""
        : accion === "MANTENER"
          ? (fila.numero_pms || "")
          : otLimpia;

    const cambio = {
      key,
      actividad_id: fila.actividad_id || "",
      empresa: fila.empresa || "",
      fila_excel: fila.fila_excel || "",
      actividad_pms: fila.actividad_pms || "",
      unidad_pms: fila.unidad_pms || "",
      aviso: fila.aviso_sap || fila.aviso_pms || (esAvisoSinOt ? fila.numero_pms : "") || "",
      ot_original: fila.numero_pms || "",
      pedido_original: fila.pedido_pms || pedidoDetectado || "",
      accion: accionFinal,
      ot_final: otFinal,
      plan_pm_final: codPmSugerido,
      pedido_final: pedidoDetectado || fila.pedido_sap || "",
      descripcion_sap_referencial: fila.descripcion_sugerida || fila.descripcion_sap || "",
      descripcion_final:
        accion === "SUGERIDA"
          ? "Se corrige OT/Pedido según sugerencia SAP. El motivo PMS no se modifica."
          : esAvisoNoOperativo && accion === "MANTENER"
            ? "El aviso aparece cerrado/no operativo en SAP. No se propone como COD PM/AVISO."
            : esAvisoSinOt && accion === "MANTENER"
              ? "Se mantiene como Aviso/COD PM. No se coloca OT porque SAP no muestra OT asociada."
              : accion === "MANTENER"
                ? "Se mantiene el valor informado en el PMS."
                : "OT ingresada manualmente por el supervisor. El motivo PMS no se modifica.",
      estado: ["MANTENER", "AVISO SIN OT", "AVISO NO OPERATIVO"].includes(accionFinal) ? "SIN CAMBIO" : "PENDIENTE DE APLICAR",
    };

    setCambiosPreparados((prev) => {
      const sinActual = prev.filter((x) => x.key !== key);
      return [...sinActual, cambio];
    });

    avisar(
      accion === "MANTENER"
        ? "Fila marcada para mantener sin cambiar."
        : "Cambio preparado. Aún no modifica el PMS.",
      "ok"
    );
  };

  const eliminarCambio = (key) => {
    setCambiosPreparados((prev) => prev.filter((x) => x.key !== key));
  };

  const aplicarCambiosEstructura = async () => {
    if (cambiosPreparados.length === 0) {
      return avisar("No hay cambios preparados para aplicar.", "err");
    }

    const confirmar = window.confirm(
      `Se aplicarán ${cambiosPreparados.length} cambio(s) al PMS.\n\n` +
      "Esto actualizará solo OT/Grafo, COD PM/AVISO y Pedido. El motivo/actividad no se modifica.\n\n" +
      "¿Continuar?"
    );

    if (!confirmar) return;

    try {
      setAplicandoCambios(true);
      avisar("Aplicando cambios al PMS...");
      const data = await aplicarCambiosControlSapEnApi({
        cambios: cambiosPreparados,
      });

      const aplicados = data?.aplicados ?? cambiosPreparados.length;
      const omitidos = data?.omitidos ?? 0;
      avisar(`Cambios aplicados: ${aplicados}. Omitidos: ${omitidos}. Revalidando...`, "ok");

      setCambiosPreparados([]);
      await validarConMaestros();
      setCambiosAplicados(true);
    } catch (err) {
      console.error("Error aplicando cambios al PMS:", err);
      avisar(`No se pudieron aplicar los cambios: ${err.message || "error desconocido"}`, "err");
    } finally {
      setAplicandoCambios(false);
    }
  };

  const descargarPmsUnicoControl = async () => {
    try {
      if (!semana) return avisar("No se encontró la semana del PMS.", "err");

      setDescargandoPmsControl(true);
      avisar("Generando PMS único...");

      const { blob, filename } = await generarPmsUnicoEnApi({ semana, central });
      const centralNombre = central === "VENTANILLA" ? "VENTANILLA" : "SANTA_ROSA";
      const nombreFinal =
        filename ||
        `PMS_${pms || getNumeroPms(semana)}_PROGRAMA_UNICO_${centralNombre}_${semana}.xlsx`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombreFinal;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      avisar("PMS único descargado correctamente.", "ok");
    } catch (err) {
      console.error("Error descargando PMS único desde Control SAP:", err);
      avisar(`No se pudo descargar el PMS único: ${err.message || "error desconocido"}`, "err");
    } finally {
      setDescargandoPmsControl(false);
    }
  };

  const resumen = resultado?.resumen || {};
  const filas = resultado?.filas || [];
  const filasVisibles = mostrarOk
    ? filas
    : filas.filter((f) => !["OK", "ACTUALIZADA"].includes(String(f?.estado || "").toUpperCase()));

  const celda = {
    padding: "9px 8px",
    verticalAlign: "top",
    borderTop: `1px solid ${C.line}`,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  };

  const thCompact = {
    ...thBase,
    background: C.navy,
    color: C.white,
    textAlign: "left",
    padding: "9px 8px",
    whiteSpace: "normal",
    lineHeight: 1.15,
  };

  const uploadBox = (file, label, onChange) => (
    <div style={{ position: "relative" }}>
      <div style={{ padding: "10px 12px", border: `1.5px dashed ${file ? C.green : C.orange}`, borderRadius: 8, color: file ? C.green : C.orange, fontWeight: 700, background: file ? C.greenBg : C.white }}>
        {file ? `${file.name} · ${fmtKB(file.size)}` : label}
      </div>
      <input
        type="file"
        accept=".xlsx,.xls,.xlsm,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
        style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
      />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.cream, fontFamily: FONT, color: C.navy }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@600;700&display=swap');
        button { font-family: inherit; cursor: pointer; }
        input, select, textarea { font-family: inherit; }
        *:focus-visible { outline: 2px solid ${C.orange}; outline-offset: 2px; }
      `}</style>

      {!embebido && (
        <header style={{ background: C.navy, color: C.white, padding: "18px 22px" }}>
          <div style={{ maxWidth: 1440, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontFamily: FONT_COND, fontWeight: 700, fontSize: 24, letterSpacing: 1, color: C.orangeLight, textTransform: "uppercase" }}>
                Validación de OTs
              </span>
              <span style={{ fontSize: 13, color: "#9AA7B2" }}>Planificación de Mantenimiento</span>
            </div>
            <div style={{ marginTop: 8, fontSize: 14, color: "#C6D0DA" }}>
              PMS {pms || "—"} · {etiquetaCentral(central)} · {rango}
            </div>
          </div>
        </header>
      )}

      <main style={{ maxWidth: embebido ? "100%" : 1440, margin: "0 auto", padding: embebido ? "0" : "22px 16px 60px" }}>
        <h3 style={sectionTitle}>Validación automática contra maestros SAP</h3>

        <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 800, color: C.navy }}>
                La validación se realizará automáticamente con la información del SAP.
              </div>
              <div style={{ fontSize: 13, color: C.slate, marginTop: 4 }}>
                No requiere clave ni subir archivos para validar. La carga de maestros queda reservada para Administración SAP.
              </div>
              {resultado && (
                <div style={{ fontSize: 12, color: C.slate, marginTop: 6 }}>
                  Última validación ejecutada correctamente para esta semana.
                </div>
              )}
            </div>
            <button
              onClick={validarConMaestros}
              disabled={validando}
              style={{ background: validando ? C.slate : C.orange, color: C.white, border: "none", borderRadius: 8, padding: "11px 16px", fontWeight: 900 }}
            >
              {validando ? "Validando..." : "Revalidar contra SAP"}
            </button>
          </div>
        </div>

        {validando && !resultado && (
          <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 10, padding: 18, color: C.slate, marginBottom: 20 }}>
            Validando automáticamente contra maestros SAP...
          </div>
        )}

        {resultado && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 20 }}>
              {[
                [resumen.actividades_revisadas || 0, "Actividades revisadas", C.navy, ""],
                [resumen.ots_ok || 0, "OTs OK", C.green, "Ocultas por defecto"],
                [resumen.avisos_como_ot || 0, "Avisos como OT", C.amber, ""],
                [resumen.avisos_sin_ot || 0, "Avisos sin OT", C.amber, ""],
                [resumen.no_encontradas || 0, "No encontradas", C.red, ""],
                [resumen.sugeridas || 0, "Sugeridas", C.blue, ""],
                [resumen.estado_no_operativo || 0, "Estado no operativo", C.red, ""],
              ].map(([v, t, col, sub]) => (
                <button
                  key={t}
                  onClick={() => t === "OTs OK" && setMostrarOk((x) => !x)}
                  style={{ textAlign: "left", background: C.white, border: `1px solid ${C.line}`, borderRadius: 10, padding: "13px 16px", minHeight: 78 }}
                >
                  <div style={{ fontFamily: FONT_COND, fontWeight: 700, fontSize: 26, color: col }}>{v}</div>
                  <div style={{ fontSize: 12, color: C.slate, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 800 }}>{t}</div>
                  {sub && <div style={{ fontSize: 11, color: C.slate, marginTop: 3 }}>{mostrarOk && t === "OTs OK" ? "Mostrando" : sub}</div>}
                </button>
              ))}
            </div>

            <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden", marginBottom: 24 }}>
              <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed", fontSize: 12 }}>
                <colgroup>
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "7%" }} />
                  <col style={{ width: "7%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "13%" }} />
                </colgroup>
                <thead>
                  <tr>
                    {["Nivel / Empresa", "N° PMS", "Aviso", "Unidad", "Actividad PMS", "OT / COD / Pedido", "Referencia SAP", "Score", "Acciones"].map((h) => <th key={h} style={thCompact}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filasVisibles.length === 0 ? (
                    <tr><td colSpan={9} style={{ padding: 18, color: C.slate }}>No hay observaciones para mostrar. Las OTs OK están ocultas por defecto.</td></tr>
                  ) : filasVisibles.map((fila, idx) => {
                    const key = filaKey(fila, idx);
                    const estado = String(fila.estado || "").toUpperCase();
                    const esOk = estado === "OK" || estado === "ACTUALIZADA";
                    const esError = ["NO_ENCONTRADA", "ESTADO_NO_OPERATIVO", "AVISO_NO_OPERATIVO"].includes(estado);
                    const bg = esOk ? C.greenBg : esError ? C.redBg : C.greenBg;
                    const colEstado = esOk ? C.green : esError ? C.red : C.amber;
                    const manual = manualPorFila[key] || "";
                    const otSugerida = fila.ot_sugerida || fila.ot_sap || "";
                    const codPm = fila.cod_pm_sugerido || fila.cod_pm_sap || fila.plan_pm_sap || fila.aviso_sap || "";
                    const pedido = fila.pedido_sugerido || fila.pedido_sap || fila.pedido_detectado || "";

                    return (
                      <tr key={key} style={{ background: bg }}>
                        <td style={{ ...celda, color: colEstado, fontWeight: 900 }}>
                          <div>{estado || "OBS"}</div>
                          <div style={{ color: C.navy }}>{fila.empresa || "—"}</div>
                          <div style={{ color: C.slate, fontWeight: 500 }}>Fila {fila.fila_excel || "—"}</div>
                        </td>
                        <td style={{ ...celda, fontWeight: 800 }}>{fila.numero_pms || "—"}</td>
                        <td style={celda}>{fila.aviso_sap || fila.aviso_pms || "—"}</td>
                        <td style={celda}>{fila.unidad_pms || "—"}</td>
                        <td style={celda}>
                          <div>{fila.actividad_pms || "—"}</div>
                          <div style={{ color: C.slate, marginTop: 3 }}>{fila.observacion || "—"}</div>
                        </td>
                        <td style={celda}>
                          <strong>OT:</strong> {otSugerida || "—"}<br />
                          <strong>COD PM/AVISO:</strong> {codPm || "—"}<br />
                          <strong>Pedido:</strong> {pedido || "—"}
                        </td>
                        <td style={celda}>{fila.descripcion_sugerida || fila.descripcion_sap || "—"}</td>
                        <td style={celda}>{fila.score_sugerencia ?? "—"}</td>
                        <td style={celda}>
                          <div style={{ display: "grid", gap: 6 }}>
                            <button
                              disabled={!otSugerida && estado !== "AVISO_SIN_OT"}
                              onClick={() => prepararCambio(fila, estado === "AVISO_SIN_OT" ? "MANTENER" : "SUGERIDA", otSugerida || fila.numero_pms)}
                              style={{ background: (!otSugerida && estado !== "AVISO_SIN_OT") ? C.slate : C.green, color: C.white, border: "none", borderRadius: 6, padding: "7px 8px", fontWeight: 800 }}
                            >
                              Cambiar
                            </button>
                            <input
                              value={manual}
                              onChange={(e) => setManualPorFila((prev) => ({ ...prev, [key]: e.target.value }))}
                              placeholder="OT manual"
                              style={{ width: "100%", boxSizing: "border-box", padding: "7px 8px", border: `1px solid ${C.line}`, borderRadius: 6 }}
                            />
                            <button
                              disabled={!manual.trim()}
                              onClick={() => prepararCambio(fila, "MANUAL", manual)}
                              style={{ background: !manual.trim() ? C.slate : C.navy, color: C.white, border: "none", borderRadius: 6, padding: "7px 8px", fontWeight: 800 }}
                            >
                              Guardar manual
                            </button>
                            <button
                              onClick={() => prepararCambio(fila, "MANTENER", fila.numero_pms)}
                              style={{ background: C.white, color: C.navy, border: `1px solid ${C.line}`, borderRadius: 6, padding: "7px 8px", fontWeight: 800 }}
                            >
                              Mantener sin cambiar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <h3 style={sectionTitle}>Cambios preparados</h3>
            {cambiosPreparados.length === 0 ? (
              <div style={{ background: C.white, border: `1px dashed ${C.line}`, borderRadius: 10, padding: 18, color: C.slate, marginBottom: 18 }}>
                Aún no hay decisiones preparadas. Usa Cambiar, Guardar manual o Mantener sin cambiar en la tabla superior.
              </div>
            ) : (
              <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden", marginBottom: 18 }}>
                <div style={{ padding: "9px 10px", fontSize: 12, color: C.slate, borderBottom: `1px solid ${C.line}` }}>
                  Estos cambios todavía no modifican el PMS. El motivo/actividad del proveedor se conserva; solo se preparan OT, COD PM/AVISO y Pedido.
                </div>
                <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed", fontSize: 12 }}>
                  <colgroup>
                    <col style={{ width: "11%" }} />
                    <col style={{ width: "5%" }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "24%" }} />
                    <col style={{ width: "7%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      {["Empresa", "Fila", "OT/Pedido informado", "Aviso informado", "Acción", "OT final", "COD PM/AVISO", "Pedido sugerido", "Actividad PMS / Referencia SAP", "Quitar"].map((h) => <th key={h} style={thCompact}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {cambiosPreparados.map((c) => (
                      <tr key={c.key}>
                        <td style={celda}>{c.empresa}</td>
                        <td style={celda}>{c.fila_excel}</td>
                        <td style={celda}>{c.ot_original || "—"}</td>
                        <td style={celda}>{c.aviso || "—"}</td>
                        <td style={{ ...celda, fontWeight: 900 }}>{c.accion}</td>
                        <td style={{ ...celda, fontWeight: 900, color: (c.accion === "MANTENER" || c.accion === "AVISO SIN OT") ? C.slate : C.green }}>{c.ot_final || "—"}</td>
                        <td style={{ ...celda, fontWeight: 800 }}>{c.plan_pm_final || "—"}</td>
                        <td style={{ ...celda, fontWeight: 800 }}>{c.pedido_final || "—"}</td>
                        <td style={celda}>
                          <div>{c.actividad_pms}</div>
                          <div style={{ color: C.slate, marginTop: 3 }}>{c.descripcion_final}</div>
                          {c.descripcion_sap_referencial && (
                            <div style={{ color: C.slate, marginTop: 3, fontSize: 11 }}>
                              Ref. SAP: {c.descripcion_sap_referencial}
                            </div>
                          )}
                        </td>
                        <td style={celda}>
                          <button onClick={() => eliminarCambio(c.key)} style={{ background: C.redBg, color: C.red, border: `1px solid ${C.red}`, borderRadius: 6, padding: "6px 8px", fontWeight: 800 }}>
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap", marginBottom: 26 }}>
              {cambiosAplicados && (
                <>
                  <button
                    onClick={() => onVerProgramacionSemanal?.()}
                    style={{
                      background: C.navy,
                      color: C.white,
                      border: "none",
                      borderRadius: 8,
                      padding: "12px 18px",
                      fontWeight: 900,
                    }}
                  >
                    Ver programación semanal
                  </button>

                  <button
                    onClick={descargarPmsUnicoControl}
                    disabled={descargandoPmsControl}
                    style={{
                      background: descargandoPmsControl ? C.slate : C.green,
                      color: C.white,
                      border: "none",
                      borderRadius: 8,
                      padding: "12px 18px",
                      fontWeight: 900,
                    }}
                  >
                    {descargandoPmsControl ? "Generando PMS..." : "Descargar PMS único"}
                  </button>
                </>
              )}

              <button
                onClick={aplicarCambiosEstructura}
                disabled={cambiosPreparados.length === 0 || aplicandoCambios}
                style={{
                  background: cambiosPreparados.length === 0 ? C.slate : C.orange,
                  color: C.white,
                  border: "none",
                  borderRadius: 8,
                  padding: "12px 18px",
                  fontWeight: 900,
                  opacity: cambiosPreparados.length === 0 ? 0.6 : 1,
                }}
              >
                {aplicandoCambios ? "Aplicando cambios..." : "Aplicar cambios a PMS"}
              </button>
            </div>
          </>
        )}

        <h3 style={sectionTitle}>Administración SAP</h3>
        <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16 }}>
          <p style={{ margin: "0 0 12px", color: C.slate, fontSize: 13 }}>
            Solo administrador: actualiza los maestros semanales de OTs y Avisos. Luego la validación se ejecuta automáticamente con esa información.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(180px, 260px) minmax(220px, 1fr) auto minmax(220px, 1fr) auto", gap: 12, alignItems: "end" }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 800, color: C.slate, textTransform: "uppercase", letterSpacing: 0.5 }}>Clave admin</label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Clave SAP"
                style={{ width: "100%", marginTop: 6, padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 8, boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 800, color: C.slate, textTransform: "uppercase", letterSpacing: 0.5 }}>Maestro OTs</label>
              <div style={{ marginTop: 6 }}>{uploadBox(adminOrdenesFile, "Seleccionar Excel SAP de OTs", setAdminOrdenesFile)}</div>
            </div>
            <button
              onClick={cargarMaestroOts}
              disabled={cargandoOts || !adminOrdenesFile}
              style={{ background: cargandoOts || !adminOrdenesFile ? C.slate : C.green, color: C.white, border: "none", borderRadius: 8, padding: "11px 14px", fontWeight: 900 }}
            >
              {cargandoOts ? "Cargando..." : "Cargar OTs"}
            </button>
            <div>
              <label style={{ fontSize: 12, fontWeight: 800, color: C.slate, textTransform: "uppercase", letterSpacing: 0.5 }}>Maestro Avisos</label>
              <div style={{ marginTop: 6 }}>{uploadBox(adminAvisosFile, "Seleccionar Excel SAP de Avisos", setAdminAvisosFile)}</div>
            </div>
            <button
              onClick={cargarMaestroAvisos}
              disabled={cargandoAvisos || !adminAvisosFile}
              style={{ background: cargandoAvisos || !adminAvisosFile ? C.slate : C.green, color: C.white, border: "none", borderRadius: 8, padding: "11px 14px", fontWeight: 900 }}
            >
              {cargandoAvisos ? "Cargando..." : "Cargar Avisos"}
            </button>
          </div>
          {adminResumen && (
            <div style={{ marginTop: 12, color: C.slate, fontSize: 12 }}>
              {adminResumen.ots && <div>Última carga OTs: {adminResumen.ots.archivo_fuente || "archivo"}</div>}
              {adminResumen.avisos && <div>Última carga Avisos: {adminResumen.avisos.archivo_fuente || "archivo"}</div>}
            </div>
          )}
        </div>
      </main>

      {localToast && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: localToast.kind === "err" ? C.red : C.navy,
            color: C.white,
            padding: "10px 18px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            zIndex: 100,
            boxShadow: "0 4px 16px rgba(0,0,0,.25)",
          }}
        >
          {localToast.msg}
        </div>
      )}
    </div>
  );
}


// ─── Maestro SAP y validación contra SAP ───
function SapControlSection({ wk, filtroCentral, centralActualLabel, notify }) {
  const [sapFile, setSapFile] = useState(null);
  const [cargandoSap, setCargandoSap] = useState(false);
  const [validandoSap, setValidandoSap] = useState(false);
  const [sapResumen, setSapResumen] = useState(null);
  const [sapValidacion, setSapValidacion] = useState(null);

  const cargarSap = async () => {
    if (!sapFile) return notify("Selecciona primero el Excel SAP de órdenes de mantenimiento.", "err");
    if (sapFile.size > MAX_SAP_FILE) return notify(`El archivo SAP supera ${fmtKB(MAX_SAP_FILE)}.`, "err");

    try {
      setCargandoSap(true);
      notify("Cargando maestro SAP...");
      const data = await cargarMaestroSapEnApi(sapFile);
      setSapResumen(data);
      setSapValidacion(null);
      notify(`Maestro SAP cargado: ${data.ots_extraidas || 0} OTs y ${data.avisos_extraidos || 0} avisos.`);
    } catch (err) {
      console.error("Error cargando maestro SAP:", err);
      notify(`No se pudo cargar el maestro SAP: ${err.message || "error desconocido"}`, "err");
    } finally {
      setCargandoSap(false);
    }
  };

  const validarSap = async () => {
    try {
      setValidandoSap(true);
      notify("Validando PMS contra maestro SAP...");
      const data = await validarPmsContraSapEnApi({
        semana: wk.id,
        central: filtroCentral,
      });
      setSapValidacion(data);
      notify(`Validación SAP terminada: ${data.observaciones_generadas || 0} observaciones.`);
    } catch (err) {
      console.error("Error validando contra SAP:", err);
      notify(`No se pudo validar contra SAP: ${err.message || "error desconocido"}`, "err");
    } finally {
      setValidandoSap(false);
    }
  };

  const estados = sapResumen?.estados || {};
  const centrales = sapResumen?.centrales || {};
  const obs = sapValidacion?.observaciones || [];

  return (
    <div style={{ marginBottom: 26 }}>
      <h3 style={sectionTitle}>Maestro SAP OT/Avisos</h3>

      <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 10, padding: 16 }}>
        <p style={{ fontSize: 14, color: C.slate, margin: "0 0 12px" }}>
          Carga el Excel de órdenes de mantenimiento exportado desde SAP. Luego valida el PMS filtrado de {centralActualLabel} contra las OTs y avisos reales.
        </p>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
          <label
            style={{
              background: C.cream,
              color: C.slate,
              border: `1px solid ${C.line}`,
              borderRadius: 8,
              padding: "9px 12px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              position: "relative",
              overflow: "hidden",
            }}
          >
            Seleccionar Excel SAP
            <input
              type="file"
              accept=".xlsx,.xls,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={(e) => setSapFile(e.target.files?.[0] || null)}
              style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
            />
          </label>

          <button
            onClick={cargarSap}
            disabled={!sapFile || cargandoSap}
            style={{
              background: !sapFile || cargandoSap ? C.slate : C.green,
              color: C.white,
              border: "none",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            {cargandoSap ? "Cargando..." : "Cargar maestro SAP"}
          </button>

          <button
            onClick={validarSap}
            disabled={validandoSap}
            style={{
              background: validandoSap ? C.slate : C.orange,
              color: C.white,
              border: "none",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            {validandoSap ? "Validando..." : "Validar PMS contra SAP"}
          </button>

          {sapFile && (
            <span style={{ fontSize: 13, color: C.slate }}>
              {sapFile.name} · {fmtKB(sapFile.size)}
            </span>
          )}
        </div>

        {sapResumen && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 10, marginBottom: 14 }}>
            {[
              [sapResumen.registros_validos || 0, "Registros SAP", C.navy],
              [sapResumen.ots_extraidas || 0, "OTs extraídas", C.green],
              [sapResumen.avisos_extraidos || 0, "Avisos extraídos", C.blue],
              [estados.LIBERADO || 0, "Liberadas", C.green],
              [estados.CERRADO_TEC || 0, "Cerradas", C.amber],
              [estados.BORRADO || 0, "Borradas", C.red],
            ].map(([v, t, col]) => (
              <div key={t} style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: "9px 10px", background: C.cream }}>
                <div style={{ fontFamily: FONT_COND, fontWeight: 700, fontSize: 22, color: col }}>{v}</div>
                <div style={{ fontSize: 11, color: C.slate, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>{t}</div>
              </div>
            ))}
          </div>
        )}

        {sapResumen && (
          <div style={{ fontSize: 12, color: C.slate, marginBottom: 12 }}>
            Centrales detectadas: {Object.entries(centrales).map(([k, v]) => `${k}: ${v}`).join(" · ") || "—"}
          </div>
        )}

        {sapValidacion && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 12 }}>
              {[
                [sapValidacion.actividades_revisadas || 0, "Actividades revisadas", C.navy],
                [sapValidacion.ots_validas || 0, "OTs válidas", C.green],
                [sapValidacion.avisos_colocados_como_ot || 0, "Avisos como OT", C.amber],
                [sapValidacion.ots_no_encontradas || 0, "No encontradas", C.red],
                [sapValidacion.ots_estado_no_operativo || 0, "Estado no operativo", C.amber],
                [sapValidacion.avisos_sin_ot || 0, "Avisos sin OT", C.amber],
              ].map(([v, t, col]) => (
                <div key={t} style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: "9px 10px", background: C.white }}>
                  <div style={{ fontFamily: FONT_COND, fontWeight: 700, fontSize: 22, color: col }}>{v}</div>
                  <div style={{ fontSize: 11, color: C.slate, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>{t}</div>
                </div>
              ))}
            </div>

            {obs.length > 0 ? (
              <div style={{ overflowX: "auto", border: `1px solid ${C.line}`, borderRadius: 8 }}>
                <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 850, fontSize: 12 }}>
                  <thead>
                    <tr>
                      {["Nivel", "Empresa", "Fila", "Número", "Observación", "Sugerencia"].map((h) => (
                        <th key={h} style={{ background: C.navy, color: C.white, padding: "8px 9px", textAlign: "left", fontFamily: FONT_COND, fontSize: 13, textTransform: "uppercase" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {obs.slice(0, 20).map((o, idx) => (
                      <tr key={`${o.numero_informado}-${idx}`} style={{ borderTop: `1px solid ${C.line}` }}>
                        <td style={{ padding: 8, fontWeight: 800, color: o.nivel === "ERROR" ? C.red : C.amber }}>{o.nivel}</td>
                        <td style={{ padding: 8 }}>{o.proveedor || "—"}</td>
                        <td style={{ padding: 8 }}>{o.fila_excel || "—"}</td>
                        <td style={{ padding: 8 }}>{o.numero_informado || "—"}</td>
                        <td style={{ padding: 8 }}>
                          <strong>{o.tipo_observacion || "Observación"}</strong>
                          <div style={{ color: C.slate, marginTop: 2 }}>{o.detalle || "—"}</div>
                          {o.actividad && <div style={{ color: C.slate, marginTop: 2 }}>Actividad: {o.actividad}</div>}
                        </td>
                        <td style={{ padding: 8 }}>{o.sugerencia || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: C.green, fontWeight: 700 }}>
                No se generaron observaciones SAP para el PMS filtrado.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Acta de reunión ───
function ActaSection({ wk, subs, empresas, faltantes, centralActualLabel, filtroCentral, notify }) {
  const [notas, setNotas] = useState("");
  const [genAt, setGenAt] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setNotas("");
    setGenAt(null);

    (async () => {
      try {
        const r = await storage.get(`acta:notas:${wk.id}:${filtroCentral}`, true);
        if (r?.value) {
          const d = JSON.parse(r.value);
          setNotas(d.notas || "");
          setGenAt(d.generatedAt || null);
        }
      } catch {}
    })();
  }, [wk.id, filtroCentral]);

  const loadTxt = (file) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => setNotas(String(r.result || ""));
    r.readAsText(file);
  };

  const diasTexto = (indices) =>
    (indices || [])
      .map((d) => `${DIAS[d]} ${fmtDia(wk.dates[d])}`)
      .join(", ");

  const armarPayloadActa = () => {
    const empresasPayload = subs.map((s) => ({
      empresa: s.empresa || "",
      expositor: s.expositor || "",
      contrato: "",
      estado_validacion: s.estadoValidacion || "",
      programo: (s.dias || []).map((d) => `${DIAS[d]} ${fmtDia(wk.dates[d])}`),
      presento: (s.presento || []).map((d) => `${DIAS[d]} ${fmtDia(wk.dates[d])}`),
      archivo: s.fileName || "",
    }));

    return {
      semana: wk.id,
      pms: `PMS ${getNumeroPms(wk.id)}`,
      rango_semana: fmtRango(wk),
      fecha_reunion: fmtFechaPunto(new Date()),
      central: centralActualLabel || etiquetaCentral(filtroCentral),
      notas,
      empresas: empresasPayload,
      faltantes,
      participantes_adicionales: [],
      acciones: [],
    };
  };

  const generar = async () => {
    if (subs.length === 0) return notify("No hay registros para generar el acta.", "err");

    setBusy(true);

    try {
      const payload = armarPayloadActa();
      const { blob, filename } = await generarActaInterferenciasEnApi(payload);

      const nombreFinal =
        filename ||
        `ACTA_INTERFERENCIAS_PMS_${getNumeroPms(wk.id)}_${filtroCentral}_${wk.id}.docx`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = nombreFinal;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);

      const now = Date.now();
      setGenAt(now);

      try {
        await storage.set(`acta:notas:${wk.id}:${filtroCentral}`, JSON.stringify({ notas, generatedAt: now }), true);
      } catch {}

      notify("Acta oficial generada correctamente.");
    } catch (err) {
      console.error("Error generando acta:", err);
      notify(`No se pudo generar el acta: ${err.message || "error desconocido"}`, "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h3 style={sectionTitle}>Acta de reunión</h3>

      <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 10, padding: 16 }}>
        <p style={{ fontSize: 14, color: C.slate, margin: "0 0 10px" }}>
          Escribe comentarios relevantes, participantes adicionales o acuerdos. La plataforma generará el Word oficial usando la plantilla RG02-P.HS.PE.013, sin llamar a una IA externa.
        </p>

        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder={`Ejemplo:
Comentarios relevantes:
No se detectaron interferencias relevantes.

Participantes adicionales:
Hector Tinoco (Orygen - HSE&Q)
Manuel Castillo (Orygen - Mantenimiento)

Acciones:
JMI regularizar observaciones del programa.`}
          rows={7}
          style={{ width: "100%", boxSizing: "border-box", padding: 12, border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 14, resize: "vertical", color: C.navy }}
        />

        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <div
              style={{
                border: `1px solid ${C.line}`,
                borderRadius: 8,
                padding: "9px 12px",
                fontSize: 13,
                fontWeight: 600,
                color: C.slate,
                background: C.cream,
              }}
            >
              Subir .txt
            </div>

            <input
              type="file"
              accept=".txt,.md,.vtt,text/plain"
              onChange={(e) => loadTxt(e.target.files?.[0])}
              aria-label="Subir notas en texto"
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }}
            />
          </div>

          <button
            onClick={generar}
            disabled={busy || subs.length === 0}
            style={{
              background: busy || subs.length === 0 ? C.slate : C.orange,
              color: C.white,
              border: "none",
              borderRadius: 8,
              padding: "10px 18px",
              fontSize: 14,
              fontWeight: 700,
              opacity: subs.length === 0 ? 0.65 : 1,
            }}
          >
            {busy ? "Generando Word…" : "Generar acta oficial"}
          </button>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: C.slate }}>
          Se incluirán automáticamente {subs.length} participante(s) del panel filtrado para {centralActualLabel}.
          {faltantes?.length ? ` Empresas pendientes: ${faltantes.join(", ")}.` : " No hay empresas pendientes de registro en la lista actual."}
          {genAt ? ` Última acta generada: ${fmtHora(genAt)}.` : ""}
        </div>

        {subs.length > 0 && (
          <div style={{ marginTop: 14, border: `1px solid ${C.line}`, borderRadius: 8, overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 640, fontSize: 12 }}>
              <thead>
                <tr>
                  {["Empresa", "Expositor", "Programó", "Presentó", "Estado"].map((h) => (
                    <th
                      key={h}
                      style={{
                        background: C.navy,
                        color: C.white,
                        padding: "7px 8px",
                        textAlign: "left",
                        fontFamily: FONT_COND,
                        textTransform: "uppercase",
                        letterSpacing: 0.4,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.id} style={{ borderTop: `1px solid ${C.line}` }}>
                    <td style={{ padding: 8, fontWeight: 700 }}>{s.empresa}</td>
                    <td style={{ padding: 8 }}>{s.expositor}</td>
                    <td style={{ padding: 8 }}>{diasTexto(s.dias) || "—"}</td>
                    <td style={{ padding: 8 }}>{diasTexto(s.presento) || "—"}</td>
                    <td style={{ padding: 8 }}>{s.estadoValidacion || "PENDIENTE"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Conversión mínima Markdown → HTML para la descarga en Word
function mdToHtml(md) {
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = md.split("\n");
  let html = "";
  let inList = false;

  for (const raw of lines) {
    const line = esc(raw);
    const fmt = (t) => t.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\*(.+?)\*/g, "<i>$1</i>");

    if (/^### /.test(line)) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += `<h3>${fmt(line.slice(4))}</h3>`;
    } else if (/^## /.test(line)) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += `<h2>${fmt(line.slice(3))}</h2>`;
    } else if (/^# /.test(line)) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += `<h1>${fmt(line.slice(2))}</h1>`;
    } else if (/^[-*] /.test(line)) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${fmt(line.slice(2))}</li>`;
    } else if (/^\d+\. /.test(line)) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${fmt(line.replace(/^\d+\. /, ""))}</li>`;
    } else if (line.trim() === "") {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += "<br/>";
    } else {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += `<p>${fmt(line)}</p>`;
    }
  }

  if (inList) html += "</ul>";

  return html;
}

const sectionTitle = {
  fontFamily: FONT_COND,
  fontWeight: 700,
  fontSize: 18,
  textTransform: "uppercase",
  letterSpacing: 0.8,
  color: "#16222E",
  margin: "0 0 10px",
  borderLeft: "4px solid #D64100",
  paddingLeft: 10,
};

const thBase = {
  padding: "8px 6px",
  color: "#FFFFFF",
  fontFamily: FONT_COND,
  fontWeight: 700,
  fontSize: 14,
  letterSpacing: 0.5,
  textTransform: "uppercase",
  textAlign: "center",
  minWidth: 56,
};

function Vacio({ texto }) {
  return (
    <div style={{ background: "#FFFFFF", border: "1px dashed #E3DAD0", borderRadius: 10, padding: "26px 18px", textAlign: "center", fontSize: 14, color: "#5C6670", marginBottom: 26 }}>
      {texto}
    </div>
  );
}
