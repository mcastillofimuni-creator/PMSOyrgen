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
const PARSER_API = "https://api-parser-pms.onrender.com";

async function validarPmsEnApi(pmsArchivoId) {
  console.log("Llamando API parser con ID:", pmsArchivoId);

  const response = await fetch(`${PARSER_API}/validar-pms`, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      pms_archivo_id: pmsArchivoId,
    }),
  });

  const data = await response.json().catch(() => ({}));

  console.log("Respuesta API parser:", response.status, data);

  if (!response.ok) {
    throw new Error(data.detail || `Error ${response.status} validando PMS`);
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

function weekInfo(offset) {
  const start = saturdayOf(new Date());
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

  const wk = weekInfo(offset);

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

  const revalidarSub = async (sub) => {
    if (!sub?.id) return notify("No se encontró el ID del registro.", "err");
    if (!sub.fileKey) return notify("Este registro no tiene archivo para validar.", "err");

    try {
      notify("Ejecutando parser PMS...");

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

      notify("PMS validado correctamente.");
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

      notify("No se pudo ejecutar el parser. Revisa Render/API o CORS.", "err");
    }
  };

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

            <div style={{ textAlign: "center", minWidth: 210 }}>
              <div style={{ fontFamily: FONT_COND, fontWeight: 700, fontSize: 20, letterSpacing: 0.5 }}>
                Semana Sáb–Vie
              </div>
              <div style={{ fontSize: 13, color: "#9AA7B2" }}>
                {fmtRango(wk)}
                {offset === 0 && <span style={{ color: C.orangeLight, fontWeight: 600 }}> · actual</span>}
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
                Hoy
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
            onRevalidar={revalidarSub}
            onSaveEmpresas={saveEmpresas}
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
          console.log("Registro creado en Supabase:", nuevoRegistro);
          notify("Archivo subido. Ejecutando validación automática...");

          await validarPmsEnApi(nuevoRegistro.id);

          notify("PMS validado correctamente.");
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

          notify("El archivo se subió, pero no se pudo validar automáticamente. Usa Revalidar o revisa Render/API.", "err");
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
      <h2 style={{ fontFamily: FONT_COND, fontWeight: 700, fontSize: 22, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 0.5 }}>
        Programa semanal
      </h2>

      <p style={{ fontSize: 14, color: C.slate, margin: "0 0 20px" }}>
        Semana del {fmtRango(wk)}. La información registrada es visible para todos los participantes.
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
function Panel({ wk, subs, loading, hoyIdx, empresas, onTogglePresento, onDelete, onDownload, onRevalidar, onSaveEmpresas, notify }) {
  const [editEmp, setEditEmp] = useState(false);
  const [nueva, setNueva] = useState("");
  const [filtroCentral, setFiltroCentral] = useState("SANTA ROSA");

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
      <h3 style={sectionTitle}>Filtro de central</h3>

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
          {visibleSubs.map((s, i) => (
            <div
              key={s.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                flexWrap: "wrap",
                borderTop: i > 0 ? `1px solid ${C.line}` : "none",
              }}
            >
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
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
                  <strong>Validación:</strong> {s.estadoValidacion || "PENDIENTE"}
                  {(s.errores || s.advertencias) ? ` · Errores: ${s.errores || 0} · Advertencias: ${s.advertencias || 0}` : ""}
                  {(s.actividades || s.observaciones) ? ` · Actividades: ${s.actividades || 0} · Observaciones: ${s.observaciones || 0}` : ""}
                </div>

                <ResumenObservacionesProveedor sub={s} filtroCentral={filtroCentral} />
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                {s.fileKey && (
                 <button
  onClick={() => revalidarArchivo(s)}
  disabled={revalidandoId === s.id}
  title="Vuelve a ejecutar la validación sobre el archivo Excel ya subido"
  style={{
    background: C.green,
    color: C.white,
    border: "none",
    borderRadius: 8,
    padding: "10px 16px",
    fontWeight: 700,
    cursor: revalidandoId === s.id ? "wait" : "pointer",
    whiteSpace: "nowrap",
  }}
>
  {revalidandoId === s.id ? "Revalidando..." : "Revalidar archivo actual"}
</button>
                )}

                {s.fileKey && (
                  <button
                    onClick={() => onDownload(s)}
                    style={{ background: C.navy, color: C.white, border: "none", borderRadius: 6, padding: "8px 12px", fontSize: 13, fontWeight: 600 }}
                  >
                    Descargar
                  </button>
                )}

                <button
                  onClick={() => onDelete(s)}
                  style={{ background: "none", color: C.red, border: `1px solid ${C.red}`, borderRadius: 6, padding: "8px 12px", fontSize: 13, fontWeight: 600 }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ActaSection wk={wk} subs={visibleSubs} empresas={empresas} faltantes={faltantes} notify={notify} />
    </div>
  );
}


// ─── Resumen amigable de observaciones para proveedor ───
function ResumenObservacionesProveedor({ sub, filtroCentral }) {
  const [abierto, setAbierto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [observaciones, setObservaciones] = useState([]);
  const [error, setError] = useState("");

  const cargarObservaciones = async () => {
    if (!sub?.id) return;

    setLoading(true);
    setError("");

    try {
      let query = supabase
        .from("pms_observaciones")
        .select(
          "id,nivel,campo,tipo_observacion,central,unidad,actividad,inspector_responsable,fila_excel,valor_detectado,sugerencia"
        )
        .eq("pms_archivo_id", sub.id)
        .order("nivel", { ascending: true })
        .order("fila_excel", { ascending: true });

      if (filtroCentral && filtroCentral !== "TODAS") {
        query = query.eq("central", filtroCentral);
      }

      const { data, error: supaError } = await query;

      if (supaError) throw supaError;

      setObservaciones(data || []);
    } catch (err) {
      console.error("Error leyendo observaciones:", err);
      setError("No se pudieron cargar las observaciones.");
    } finally {
      setLoading(false);
    }
  };

  const toggle = async () => {
    const nuevoEstado = !abierto;
    setAbierto(nuevoEstado);

    if (nuevoEstado && observaciones.length === 0) {
      await cargarObservaciones();
    }
  };

  const resumen = generarResumenObservaciones(observaciones);

  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={toggle}
        style={{
          background: abierto ? C.navy : C.white,
          color: abierto ? C.white : C.navy,
          border: `1px solid ${abierto ? C.navy : C.line}`,
          borderRadius: 6,
          padding: "6px 10px",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {abierto ? "Ocultar observaciones" : "Ver observaciones"}
      </button>

      {abierto && (
        <div
          style={{
            marginTop: 10,
            padding: 12,
            border: `1px solid ${C.line}`,
            borderRadius: 8,
            background: "#FBF8F4",
          }}
        >
          {loading ? (
            <div style={{ fontSize: 13, color: C.slate }}>Cargando observaciones…</div>
          ) : error ? (
            <div style={{ fontSize: 13, color: C.red }}>{error}</div>
          ) : observaciones.length === 0 ? (
            <div style={{ fontSize: 13, color: C.green, fontWeight: 600 }}>
              No se encontraron observaciones para esta central.
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <MiniCardObs
                  titulo="Estado"
                  valor={resumen.estado}
                  color={resumen.errores > 0 ? C.red : resumen.advertencias > 0 ? C.amber : C.green}
                />

                <MiniCardObs
                  titulo="Errores"
                  valor={resumen.errores}
                  color={resumen.errores > 0 ? C.red : C.green}
                />

                <MiniCardObs
                  titulo="Advertencias"
                  valor={resumen.advertencias}
                  color={resumen.advertencias > 0 ? C.amber : C.green}
                />

                <MiniCardObs
                  titulo="Filas observadas"
                  valor={resumen.filasObservadas}
                  color={C.navy}
                />
              </div>

              <div style={{ fontSize: 13, color: C.navy, marginBottom: 8 }}>
                <strong>Resumen:</strong>{" "}
                {resumen.principales.length > 0
                  ? resumen.principales.map((x) => `${x.nombre}: ${x.cantidad}`).join(" · ")
                  : "Sin observaciones agrupadas."}
              </div>

              {resumen.otsObservadas.length > 0 && (
                <div style={{ fontSize: 13, color: C.navy, marginBottom: 10 }}>
                  <strong>OTs observadas:</strong>{" "}
                  {resumen.otsObservadas.slice(0, 8).join(", ")}
                  {resumen.otsObservadas.length > 8 ? ` y ${resumen.otsObservadas.length - 8} más` : ""}
                </div>
              )}

              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 12,
                    background: C.white,
                    border: `1px solid ${C.line}`,
                  }}
                >
                  <thead>
                    <tr style={{ background: C.navy, color: C.white }}>
                      <th style={thObs}>Nivel</th>
                      <th style={thObs}>Fila</th>
                      <th style={thObs}>Observación</th>
                      <th style={thObs}>Actividad</th>
                      <th style={thObs}>Valor detectado</th>
                      <th style={thObs}>Sugerencia</th>
                    </tr>
                  </thead>

                  <tbody>
                    {ordenarObservacionesParaProveedor(observaciones).slice(0, 8).map((o) => (
                      <tr key={o.id} style={{ borderTop: `1px solid ${C.line}` }}>
                        <td style={tdObs}>
                          <span
                            style={{
                              padding: "3px 7px",
                              borderRadius: 999,
                              fontWeight: 700,
                              color: o.nivel === "ERROR" ? C.red : C.amber,
                              background: o.nivel === "ERROR" ? C.redBg : C.amberBg,
                              border: `1px solid ${o.nivel === "ERROR" ? C.red : C.amber}`,
                            }}
                          >
                            {o.nivel}
                          </span>
                        </td>

                        <td style={tdObs}>{o.fila_excel || "—"}</td>

                        <td style={tdObs}>
                          <strong>{o.tipo_observacion || "Observación"}</strong>
                          <div style={{ color: C.slate, marginTop: 2 }}>
                            Campo: {traducirCampo(o.campo)}
                          </div>
                        </td>

                        <td style={tdObs}>
                          {o.actividad || "—"}
                          {o.unidad ? (
                            <div style={{ color: C.slate, marginTop: 2 }}>
                              Unidad: {o.unidad}
                            </div>
                          ) : null}
                        </td>

                        <td style={tdObs}>{o.valor_detectado || "—"}</td>

                        <td style={tdObs}>{o.sugerencia || "Revisar información."}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {observaciones.length > 8 && (
                <div style={{ fontSize: 12, color: C.slate, marginTop: 8 }}>
                  Mostrando las primeras 8 observaciones de {observaciones.length}.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MiniCardObs({ titulo, valor, color }) {
  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${C.line}`,
        borderRadius: 8,
        padding: "8px 10px",
      }}
    >
      <div
        style={{
          fontFamily: FONT_COND,
          fontWeight: 700,
          fontSize: 20,
          color,
          lineHeight: 1,
        }}
      >
        {valor}
      </div>
      <div
        style={{
          fontSize: 11,
          color: C.slate,
          textTransform: "uppercase",
          letterSpacing: 0.4,
          fontWeight: 700,
          marginTop: 4,
        }}
      >
        {titulo}
      </div>
    </div>
  );
}

function generarResumenObservaciones(observaciones) {
  const errores = observaciones.filter((o) => o.nivel === "ERROR").length;
  const advertencias = observaciones.filter((o) => o.nivel === "ADVERTENCIA").length;

  const filasObservadas = new Set(
    observaciones
      .map((o) => o.fila_excel)
      .filter((x) => x !== null && x !== undefined && x !== "")
  ).size;

  const contador = {};

  for (const o of observaciones) {
    const nombre = simplificarTipoObservacion(o);
    contador[nombre] = (contador[nombre] || 0) + 1;
  }

  const principales = Object.entries(contador)
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 4);

  const otsObservadas = [
    ...new Set(
      observaciones
        .filter((o) => String(o.campo || "").toLowerCase().includes("ot"))
        .map((o) => String(o.valor_detectado || "").trim())
        .filter((v) => v && v !== "EMPTY" && v !== "-")
    ),
  ];

  const estado =
    errores > 0
      ? "Observado"
      : advertencias > 0
        ? "Con advertencias"
        : "Validado";

  return {
    errores,
    advertencias,
    filasObservadas,
    principales,
    otsObservadas,
    estado,
  };
}

function simplificarTipoObservacion(o) {
  const texto = String(o.tipo_observacion || "").toUpperCase();
  const campo = String(o.campo || "").toUpperCase();

  if (texto.includes("ACTIVIDAD SIN OT")) return "Sin OT";
  if (texto.includes("OT CON CANTIDAD INCORRECTA")) return "OT inválida";
  if (texto.includes("OT INICIA")) return "OT con inicio no permitido";
  if (campo.includes("UNIDAD")) return "Unidad vacía";
  if (campo.includes("CENTRAL")) return "Central vacía";
  if (campo.includes("INSPECTOR")) return "Inspector vacío";
  if (campo.includes("RT")) return "RT terceros vacío";
  if (campo.includes("CONDICION")) return "Condición no estándar";

  return o.tipo_observacion || "Observación";
}

function traducirCampo(campo) {
  const c = String(campo || "").toLowerCase();

  if (c.includes("ot")) return "OT";
  if (c.includes("unidad")) return "Unidad / Grupo";
  if (c.includes("central")) return "Central";
  if (c.includes("inspector")) return "Inspector Orygen";
  if (c.includes("rt")) return "RT terceros";
  if (c.includes("actividad")) return "Actividad";
  if (c.includes("condicion")) return "Condición";

  return campo || "—";
}

const thObs = {
  padding: "8px 8px",
  textAlign: "left",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 0.4,
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const tdObs = {
  padding: "8px 8px",
  verticalAlign: "top",
  color: C.navy,
  borderLeft: `1px solid ${C.line}`,
};


// ─── Acta de reunión ───
function ActaSection({ wk, subs, empresas, faltantes, notify }) {
  const [transcript, setTranscript] = useState("");
  const [acta, setActa] = useState("");
  const [genAt, setGenAt] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setActa("");
    setTranscript("");
    setGenAt(null);

    (async () => {
      try {
        const r = await storage.get(`acta:${wk.id}`, true);
        if (r?.value) {
          const d = JSON.parse(r.value);
          setActa(d.acta || "");
          setTranscript(d.transcript || "");
          setGenAt(d.generatedAt || null);
        }
      } catch {}
    })();
  }, [wk.id]);

  const loadTxt = (file) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => setTranscript(String(r.result || ""));
    r.readAsText(file);
  };

  const generar = async () => {
    if (!transcript.trim()) return notify("Pega o sube primero la transcripción de la reunión.", "err");

    setBusy(true);

    try {
      const contexto = subs
        .map(
          (s) =>
            `- ${s.empresa} | Central: ${etiquetaCentral(s.centralPresentada)} | Expositor: ${s.expositor} | Programó: ${(s.dias || []).map((d) => `${DIAS[d]} ${fmtDia(wk.dates[d])}`).join(", ")} | Presentó: ${(s.presento || []).length ? (s.presento || []).map((d) => DIAS[d]).join(", ") : "ninguno aún"} | Archivo: ${s.fileName || "no subió programa"}`
        )
        .join("\n");

      const prompt = `Eres asistente del Supervisor de Mantenimiento Eléctrico de Orygen Perú. Redacta el ACTA DE REUNIÓN SEMANAL DE PROVEEDORES en español formal y técnico, en formato Markdown.

DATOS DE LA SEMANA (Sábado a Viernes, ${fmtRango(wk)}):
Empresas registradas en la plataforma:
${contexto || "(ninguna registrada)"}
Empresas que NO subieron su programa: ${faltantes.length ? faltantes.join(", ") : "ninguna"}

TRANSCRIPCIÓN DE LA REUNIÓN:
${transcript}

ESTRUCTURA REQUERIDA del acta:
# ACTA DE REUNIÓN SEMANAL DE PROVEEDORES
1. **Datos generales**: fecha de la reunión, semana operativa (rango de fechas), área (Mantenimiento Eléctrico).
2. **Asistentes**: tabla o lista de empresa, central declarada y expositor (cruza los registros de la plataforma con lo mencionado en la transcripción).
3. **Desarrollo**: resumen por empresa de lo expuesto (actividades de la semana, avances, restricciones), basado estrictamente en la transcripción.
4. **Acuerdos y compromisos**: lista numerada con responsable y fecha límite cuando se mencione.
5. **Pendientes y observaciones**: incluye empresas que no subieron programa o no expusieron.
6. **Próxima reunión**: si se menciona.

Reglas: no inventes información que no esté en la transcripción ni en los datos; si algo no se mencionó, indícalo como "no tratado". Responde SOLO con el acta en Markdown, sin preámbulo.`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();

      const texto = (data.content || [])
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();

      if (!texto) throw new Error("vacío");

      setActa(texto);

      const now = Date.now();
      setGenAt(now);

      try {
        await storage.set(`acta:${wk.id}`, JSON.stringify({ transcript, acta: texto, generatedAt: now }), true);
      } catch {}

      notify("Acta generada y guardada.");
    } catch {
      notify("No se pudo generar el acta. Intenta de nuevo.", "err");
    } finally {
      setBusy(false);
    }
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(acta);
      notify("Acta copiada al portapapeles.");
    } catch {
      notify("No se pudo copiar.", "err");
    }
  };

  const descargarDoc = () => {
    const html = mdToHtml(acta);
    const doc = `<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><style>body{font-family:Barlow,Arial,sans-serif;color:#16222E;line-height:1.5}h1{color:#D64100;border-bottom:2px solid #D64100;padding-bottom:6px}h2{color:#16222E}table{border-collapse:collapse}td,th{border:1px solid #999;padding:4px 8px}</style></head><body>${html}</body></html>`;
    const blob = new Blob(["\ufeff", doc], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `Acta_Reunion_Proveedores_${wk.id}.doc`;
    a.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <h3 style={sectionTitle}>Acta de reunión</h3>

      <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 10, padding: 16 }}>
        <p style={{ fontSize: 14, color: C.slate, margin: "0 0 10px" }}>
          Pega la transcripción resumida (Copilot) o sube el archivo .txt. El acta se genera cruzando la transcripción con los registros de la matriz semanal filtrada.
        </p>

        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Pega aquí la transcripción de la reunión…"
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
              aria-label="Subir transcripción en texto"
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }}
            />
          </div>

          <button
            onClick={generar}
            disabled={busy}
            style={{ background: busy ? C.slate : C.orange, color: C.white, border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 14, fontWeight: 700 }}
          >
            {busy ? "Generando acta…" : "Generar acta de reunión"}
          </button>
        </div>

        {acta && (
          <div style={{ marginTop: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: C.slate, fontWeight: 600 }}>
                {genAt ? `Generada ${fmtHora(genAt)} · guardada para esta semana` : ""}
              </span>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={copiar}
                  style={{ background: "none", border: `1px solid ${C.line}`, borderRadius: 6, padding: "7px 12px", fontSize: 13, fontWeight: 600, color: C.navy }}
                >
                  Copiar
                </button>

                <button
                  onClick={descargarDoc}
                  style={{ background: C.navy, color: C.white, border: "none", borderRadius: 6, padding: "7px 12px", fontSize: 13, fontWeight: 600 }}
                >
                  Descargar Word
                </button>
              </div>
            </div>

            <div
              style={{
                border: `1px solid ${C.line}`,
                borderRadius: 8,
                padding: 16,
                background: "#FBF8F4",
                fontSize: 14,
                lineHeight: 1.55,
                whiteSpace: "pre-wrap",
                maxHeight: 420,
                overflowY: "auto",
              }}
            >
              {acta}
            </div>
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
function ordenarObservacionesParaProveedor(observaciones) {
  const prioridadNivel = {
    ERROR: 1,
    ADVERTENCIA: 2,
  };

  return [...observaciones].sort((a, b) => {
    const prioridadA = prioridadNivel[a.nivel] || 99;
    const prioridadB = prioridadNivel[b.nivel] || 99;

    if (prioridadA !== prioridadB) {
      return prioridadA - prioridadB;
    }

    const filaA = Number(a.fila_excel || 999999);
    const filaB = Number(b.fila_excel || 999999);

    if (filaA !== filaB) {
      return filaA - filaB;
    }

    const obsA = String(a.tipo_observacion || "");
    const obsB = String(b.tipo_observacion || "");

    return obsA.localeCompare(obsB);
  });
}
function Vacio({ texto }) {
  return (
    <div style={{ background: "#FFFFFF", border: "1px dashed #E3DAD0", borderRadius: 10, padding: "26px 18px", textAlign: "center", fontSize: 14, color: "#5C6670", marginBottom: 26 }}>
      {texto}
    </div>
  );
}
