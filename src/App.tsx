import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  getCantones,
  getNacionalidades,
  getParroquias,
  getProvincias,
  submitRegistration,
  type CatalogItem,
} from "./api";
import AdminApp from "./AdminApp";

const whatsappSupportUrl = "https://wa.me/593993096923?text=Hola%2C%20necesito%20ayuda%20con%20Capacitate%20Manabi.";
const steps = ["Datos personales", "Ubicación", "Perfil", "Confirmación"];
const modules = [
  ["01", "Derechos Humanos", "Origen, principios, garantías y aplicación de los derechos humanos en la vida cotidiana."],
  ["02", "Participación Ciudadana", "Herramientas para incidir, liderar y transformar responsablemente tu comunidad."],
  ["03", "Liderazgo y Organización Social", "Estilos de liderazgo, organizaciones sociales y decisiones colectivas."],
  ["04", "Políticas Públicas y Proyectos", "Diseño de políticas públicas y propuestas concretas para el territorio."],
];

type Values = Record<string, string | boolean>;
const initialValues: Values = {};

function Field({ label, name, type = "text", placeholder, required = false, hint, value, onChange, autoComplete }: {
  label: string; name: string; type?: string; placeholder?: string; required?: boolean; hint?: string;
  value: string | boolean; onChange: (name: string, value: string | boolean) => void; autoComplete?: string;
}) {
  required = required && !["barrio", "institucion"].includes(name);
  const hintId = hint ? `${name}-hint` : undefined;
  return <div className="field">
    <label htmlFor={name}>{label}{required && <span aria-hidden="true"> *</span>}</label>
    {hint && <p id={hintId} className="hint">{hint}</p>}
    <input id={name} name={name} type={type} placeholder={placeholder} required={required}
      aria-describedby={hintId} autoComplete={autoComplete} value={String(value || "")}
      onChange={(e) => onChange(name, e.target.value)} />
  </div>;
}

function Select({ label, name, options, required = false, hint, value, onChange }: {
  label: string; name: string; options: string[]; required?: boolean; hint?: string;
  value: string | boolean; onChange: (name: string, value: string | boolean) => void;
}) {
  required = false;
  const hintId = hint ? `${name}-hint` : undefined;
  return <div className="field">
    <label htmlFor={name}>{label}{required && <span aria-hidden="true"> *</span>}</label>
    {hint && <p id={hintId} className="hint">{hint}</p>}
    <select id={name} name={name} required={required} aria-describedby={hintId}
      value={String(value || "")} onChange={(e) => onChange(name, e.target.value)}>
      <option value="">Selecciona una opción</option>
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  </div>;
}

const months = [
  ["01", "Enero"],
  ["02", "Febrero"],
  ["03", "Marzo"],
  ["04", "Abril"],
  ["05", "Mayo"],
  ["06", "Junio"],
  ["07", "Julio"],
  ["08", "Agosto"],
  ["09", "Septiembre"],
  ["10", "Octubre"],
  ["11", "Noviembre"],
  ["12", "Diciembre"],
];

const phoneCountries = [
  { code: "593", flag: "🇪🇨", name: "Ecuador" },
  { code: "57", flag: "🇨🇴", name: "Colombia" },
  { code: "51", flag: "🇵🇪", name: "Perú" },
  { code: "1", flag: "🇺🇸", name: "Estados Unidos" },
  { code: "34", flag: "🇪🇸", name: "España" },
];

function BirthDateField({ value, onChange }: {
  value: string | boolean; onChange: (name: string, value: string | boolean) => void;
}) {
  const currentYear = new Date().getFullYear();
  const [initialYear = "", initialMonth = "", initialDay = ""] = String(value || "").split("-");
  const [day, setDay] = useState(initialDay);
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const years = useMemo(
    () => Array.from({ length: 90 }, (_, index) => String(currentYear - 12 - index)),
    [currentYear],
  );
  const days = useMemo(() => {
    const total = year && month ? new Date(Number(year), Number(month), 0).getDate() : 31;
    return Array.from({ length: total }, (_, index) => String(index + 1).padStart(2, "0"));
  }, [year, month]);

  useEffect(() => {
    const [nextYear = "", nextMonth = "", nextDay = ""] = String(value || "").split("-");
    setYear(nextYear);
    setMonth(nextMonth);
    setDay(nextDay);
  }, [value]);

  const updatePart = (part: "day" | "month" | "year", nextValue: string) => {
    const nextYear = part === "year" ? nextValue : year;
    const nextMonth = part === "month" ? nextValue : month;
    let nextDay = part === "day" ? nextValue : day;
    if (nextYear && nextMonth && nextDay) {
      const maxDay = new Date(Number(nextYear), Number(nextMonth), 0).getDate();
      if (Number(nextDay) > maxDay) nextDay = String(maxDay).padStart(2, "0");
    }
    setYear(nextYear);
    setMonth(nextMonth);
    setDay(nextDay);
    onChange("fechaNac", nextYear && nextMonth && nextDay ? `${nextYear}-${nextMonth}-${nextDay}` : "");
  };

  return <div className="field">
    <label htmlFor="fechaNac-dia">Fecha de nacimiento<span aria-hidden="true"> *</span></label>
    <div className="birthdate-grid">
      <select id="fechaNac-dia" value={day} onChange={(e) => updatePart("day", e.target.value)} required aria-label="Día de nacimiento">
        <option value="">Día</option>
        {days.map(item => <option key={item} value={item}>{item}</option>)}
      </select>
      <select value={month} onChange={(e) => updatePart("month", e.target.value)} required aria-label="Mes de nacimiento">
        <option value="">Mes</option>
        {months.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select>
      <select value={year} onChange={(e) => updatePart("year", e.target.value)} required aria-label="Año de nacimiento">
        <option value="">Año</option>
        {years.map(item => <option key={item} value={item}>{item}</option>)}
      </select>
    </div>
  </div>;
}

function PhoneField({ value, countryCode, onChange }: {
  value: string | boolean; countryCode: string | boolean; onChange: (name: string, value: string | boolean) => void;
}) {
  const selectedCode = String(countryCode || "593");
  const rawValue = String(value || "");
  const localValue = rawValue.startsWith(`+${selectedCode}`)
    ? rawValue.slice(selectedCode.length + 1)
    : rawValue.replace(/^\+?593/, "").replace(/^0(?=\d)/, "");

  const updatePhone = (nextCode: string, nextLocal: string) => {
    const cleaned = nextLocal.replace(/[^\d]/g, "").replace(/^0(?=\d)/, "");
    onChange("celular_pais", nextCode);
    onChange("celular", cleaned ? `+${nextCode}${cleaned}` : "");
  };

  return <div className="field">
    <label htmlFor="celular">Celular<span aria-hidden="true"> *</span></label>
    <p id="celular-hint" className="hint">Lo usaremos para notificaciones del curso.</p>
    <div className="phone-grid">
      <select value={selectedCode} onChange={(e) => updatePhone(e.target.value, localValue)} aria-label="Código de país">
        {phoneCountries.map(country => (
          <option key={country.code} value={country.code}>{country.flag} +{country.code} {country.name}</option>
        ))}
      </select>
      <input id="celular" name="celular" type="tel" inputMode="tel" placeholder="982104735" required
        aria-describedby="celular-hint" autoComplete="tel-national" value={localValue}
        onChange={(e) => updatePhone(selectedCode, e.target.value)} />
    </div>
  </div>;
}

function CatalogSelect({ label, name, items, required = false, value, disabled = false, onChange }: {
  label: string; name: string; items: CatalogItem[]; required?: boolean; value: string | boolean; disabled?: boolean;
  onChange: (name: string, id: string, nombre: string) => void;
}) {
  required = false;
  return <div className="field">
    <label htmlFor={name}>{label}{required && <span aria-hidden="true"> *</span>}</label>
    <select id={name} name={name} required={required} disabled={disabled}
      value={String(value || "")}
      onChange={(e) => {
        const selected = items.find(item => String(item.id) === e.target.value);
        onChange(name, e.target.value, selected?.nombre ?? "");
      }}>
      <option value="">Selecciona una opción</option>
      {items.map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}
    </select>
  </div>;
}

function Choice({ legend, name, options, required = false, hint, value, onChange }: {
  legend: string; name: string; options: string[]; required?: boolean; hint?: string;
  value: string | boolean; onChange: (name: string, value: string | boolean) => void;
}) {
  required = false;
  return <fieldset className="choice">
    <legend>{legend}{required && <span aria-hidden="true"> *</span>}</legend>
    {hint && <p className="hint">{hint}</p>}
    <div className="chips">
      {options.map(o => <label key={o} className={value === o ? "selected" : ""}>
        <input type="radio" name={name} value={o} required={required} checked={value === o}
          onChange={() => onChange(name, o)} /><span>{o}</span>
      </label>)}
    </div>
  </fieldset>;
}

export default function App() {
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
    return <AdminApp />;
  }

  return <PublicApp />;
}

function PublicApp() {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Values>(initialValues);
  const [showModules, setShowModules] = useState(false);
  const [notice, setNotice] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [provincias, setProvincias] = useState<CatalogItem[]>([]);
  const [cantones, setCantones] = useState<CatalogItem[]>([]);
  const [parroquias, setParroquias] = useState<CatalogItem[]>([]);
  const [nacionalidades, setNacionalidades] = useState<CatalogItem[]>([]);

  useEffect(() => {
    const draft = localStorage.getItem("capacitacion-manabi-borrador");
    if (draft) try { setValues(JSON.parse(draft)); setNotice("Recuperamos tu borrador guardado en este dispositivo."); } catch {}
  }, []);

  useEffect(() => {
    getProvincias()
      .then(setProvincias)
      .catch(error => setNotice(error instanceof Error ? error.message : "No se pudieron cargar las provincias."));
  }, []);

  useEffect(() => {
    getNacionalidades()
      .then(items => {
        setNacionalidades(items);
        setValues(current => {
          if (current.nacionalidad_id || current.nacionalidad) return current;
          const ecuador = items.find(item => /ecuador|ecuator/i.test(item.nombre));
          if (!ecuador) return current;
          return { ...current, nacionalidad_id: String(ecuador.id), nacionalidad: ecuador.nombre };
        });
      })
      .catch(error => setNotice(error instanceof Error ? error.message : "No se pudieron cargar las nacionalidades."));
  }, []);

  useEffect(() => {
    const provinciaId = Number(values.provincia_id || 0);
    if (!provinciaId) {
      setCantones([]);
      setParroquias([]);
      return;
    }
    getCantones(provinciaId)
      .then(setCantones)
      .catch(error => setNotice(error instanceof Error ? error.message : "No se pudieron cargar los cantones."));
  }, [values.provincia_id]);

  useEffect(() => {
    const cantonId = Number(values.canton_id || 0);
    if (!cantonId) {
      setParroquias([]);
      return;
    }
    getParroquias(cantonId)
      .then(setParroquias)
      .catch(error => setNotice(error instanceof Error ? error.message : "No se pudieron cargar las parroquias."));
  }, [values.canton_id]);

  const update = (name: string, value: string | boolean) => setValues(v => ({ ...v, [name]: value }));
  const requiredByStep = useMemo(() => [
    ["cedula", "fechaNac", "nombres", "apellidos", "correo", "celular"],
    [],
    [],
    ["acepto"],
  ], []);

  const updateGeo = (name: string, id: string, nombre: string) => {
    if (name === "provincia_id") {
      setValues(v => ({
        ...v,
        provincia_id: id,
        provincia: nombre,
        canton_id: "",
        canton: "",
        parroquia_id: "",
        parroquia: "",
      }));
      return;
    }
    if (name === "canton_id") {
      setValues(v => ({
        ...v,
        canton_id: id,
        canton: nombre,
        parroquia_id: "",
        parroquia: "",
      }));
      return;
    }
    setValues(v => ({ ...v, [name]: id, parroquia: nombre }));
  };

  const updateNationality = (name: string, id: string, nombre: string) => {
    setValues(v => ({ ...v, [name]: id, nacionalidad: nombre }));
  };

  const resetAfterSuccess = () => {
    setDone(false);
    setStarted(false);
    setStep(0);
    setValues(initialValues);
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const advance = async (e: FormEvent) => {
    e.preventDefault();
    const missing = requiredByStep[step].find(key => !values[key]);
    if (missing) {
      const focusId = missing === "fechaNac" ? "fechaNac-dia" : missing;
      const el = document.getElementById(focusId);
      el?.focus();
      setNotice("Revisa el campo señalado antes de continuar.");
      return;
    }
    setNotice("");
    if (step < 3) { setStep(step + 1); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    try {
      setSubmitting(true);
      await submitRegistration(values);
      localStorage.removeItem("capacitacion-manabi-borrador");
      setDone(true);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo registrar la inscripción.");
    } finally {
      setSubmitting(false);
    }
  };

  const saveDraft = () => {
    localStorage.setItem("capacitacion-manabi-borrador", JSON.stringify(values));
    setNotice("Borrador guardado de forma segura en este dispositivo.");
  };

  const startRegistration = () => {
    setStarted(true);
    setStep(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const returnToCourse = () => {
    setStarted(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return <main>
    <header className="topbar">
      <a className="brand" href="#inicio" aria-label="Capacítate Manabí, inicio">
        <img className="brand-prefecture" src="/logo-capacitate-manabi.png" alt="Prefectura de Manabí" />
        <img className="brand-capacitate" src="/logo-capacitate-manabi-wordmark.png" alt="Capacítate Manabí" />
      </a>
      {started
        ? <button className="back-course" type="button" onClick={returnToCourse}>← Volver a la información del curso</button>
        : <a className="help" href={whatsappSupportUrl} target="_blank" rel="noreferrer">¿Necesitas ayuda?</a>}
    </header>

    {!started && <>
    <figure className="cover">
      <img src="/manabi-portada.jpeg" alt="Ciudadanía manabita celebrando con banderas y el mensaje Manabí cambia para siempre" />
    </figure>
    <section className="hero" id="inicio">
      <div className="hero-copy">
        <p className="eyebrow">ESCUELA DE FORMACIÓN CIUDADANA</p>
        <h1>Tu liderazgo puede transformar el territorio.</h1>
        <p className="lead">Preinscríbete en el programa virtual de liderazgo y participación ciudadana de Manabí.</p>
        <div className="facts">
          <div><span>Inicio</span><strong>Septiembre 2026</strong></div>
          <div><span>Modalidad</span><strong>Virtual asincrónica</strong></div>
          <div><span>Duración</span><strong>48 horas académicas</strong></div>
          <div><span>Aval</span><strong>Universidad Técnica de Manabí</strong></div>
        </div>
        <button className="outline" onClick={() => setShowModules(!showModules)} aria-expanded={showModules}>
          {showModules ? "Ocultar contenido" : "Ver contenido del curso"} <span aria-hidden="true">{showModules ? "−" : "+"}</span>
        </button>
      </div>
      <div className="hero-panel" aria-label="Resumen de la inscripción">
        <div className="partners" aria-label="Partners">
          <span>Partners</span>
          <img src="/logo-utm.png" alt="Universidad Técnica de Manabí" />
        </div>
        <p className="learning-note"><strong>Certificación académica</strong><span>Aprende a tu ritmo, desde cualquier lugar.</span></p>
        <button className="start-link" type="button" onClick={startRegistration}><span className="start-label"><small>Da el primer paso</small>Iniciar preinscripción</span><span className="start-arrow" aria-hidden="true">→</span></button>
      </div>
    </section>

    {showModules && <section className="modules" aria-label="Contenido del curso">
      {modules.map(([n,t,d]) => <article key={n}><span>{n}</span><div><h2>{t}</h2><p>{d}</p></div></article>)}
    </section>}
    </>}

    {started &&
    <section className="form-wrap" id="formulario">
      <aside>
        <p className="eyebrow">PREINSCRIPCIÓN</p>
        <h2>Completa tu registro</h2>
        <p>Te tomará aproximadamente 4 minutos. Los campos marcados con * son obligatorios.</p>
        <ol aria-label="Progreso del formulario">
          {steps.map((s, i) => <li key={s} className={i === step ? "active" : i < step ? "complete" : ""}>
            <button type="button" onClick={() => i < step && setStep(i)} disabled={i > step}>
              <span>{i < step ? "✓" : i + 1}</span><div><small>Paso {i + 1}</small><strong>{s}</strong></div>
            </button>
          </li>)}
        </ol>
        <div className="privacy-note"><span aria-hidden="true">◎</span><p><strong>Tus datos están protegidos</strong><br/>Se usarán únicamente para la gestión y seguimiento del programa formativo.</p></div>
      </aside>

      <form onSubmit={advance} noValidate aria-busy={submitting}>
        {submitting && <div className="sending-overlay" role="status" aria-live="polite">
          <span className="sending-spinner" aria-hidden="true"></span>
          <strong>Enviando preinscripción</strong>
          <small>Estamos registrando tus datos. Esto puede tardar unos segundos.</small>
        </div>}
        <div className="form-head">
          <p>PASO {step + 1} DE 4</p>
          <h2>{steps[step]}</h2>
          <span>{step === 0 ? "Cuéntanos quién eres." : step === 1 ? "Indica desde qué lugar participas." : step === 2 ? "Esta información nos ayuda a conocer mejor a las personas participantes." : "Revisa y acepta las condiciones de participación."}</span>
        </div>
        {notice && <div className="notice" role="status">{notice}</div>}

        {step === 0 && <div className="grid">
          <Field label="Número de cédula" name="cedula" placeholder="Ej. 1234567890" required hint="Ingresa los 10 dígitos, sin guiones." value={values.cedula} onChange={update} autoComplete="off"/>
          <BirthDateField value={values.fechaNac} onChange={update}/>
          <Field label="Nombres" name="nombres" placeholder="Tus nombres" required value={values.nombres} onChange={update} autoComplete="given-name"/>
          <Field label="Apellidos" name="apellidos" placeholder="Tus apellidos" required value={values.apellidos} onChange={update} autoComplete="family-name"/>
          <Field label="Correo electrónico" name="correo" type="email" placeholder="nombre@correo.com" required value={values.correo} onChange={update} autoComplete="email"/>
          <PhoneField value={values.celular} countryCode={values.celular_pais} onChange={update}/>
        </div>}

        {step === 1 && <div className="grid">
          <CatalogSelect label="Provincia" name="provincia_id" required items={provincias} value={values.provincia_id} onChange={updateGeo}/>
          <CatalogSelect label="Cantón" name="canton_id" required items={cantones} value={values.canton_id} disabled={!values.provincia_id} onChange={updateGeo}/>
          <CatalogSelect label="Parroquia" name="parroquia_id" required items={parroquias} value={values.parroquia_id} disabled={!values.canton_id} onChange={updateGeo}/>
          <Field label="Comunidad, barrio o sector" name="barrio" placeholder="Ej. Picoazá" required hint="Nos permite comprender la cobertura territorial del programa." value={values.barrio} onChange={update}/>
        </div>}

        {step === 2 && <div className="stack">
          <Choice legend="¿Trabajas o estudias?" name="actividad" required options={["Trabajo","Estudio","Trabajo y estudio","Ninguno"]} value={values.actividad} onChange={update}/>
          <Field label="Institución en la que trabajas o estudias" name="institucion" placeholder="Ej. Universidad Técnica de Manabí" required value={values.institucion} onChange={update} autoComplete="organization"/>
          <Choice legend="Autoidentificación" name="autoidentificacion" required hint="Este dato se solicita para fines estadísticos y de inclusión." options={["Mestizo/a","Indígena","Cholo/a","Montuvio/a","Afrodescendiente","Blanco/a"]} value={values.autoidentificacion} onChange={update}/>
          <div className="grid">
            <Select label="Género" name="genero" required options={["Mujer","Hombre","No binario","Prefiero no decirlo","Otros"]} value={values.genero} onChange={update}/>
            <Select label="Orientación sexual" name="orientacion" required hint="Información sensible usada únicamente con fines estadísticos." options={["Heterosexual","Homosexual","Bisexual","Pansexual","Asexual","Prefiero no decirlo"]} value={values.orientacion} onChange={update}/>
            <CatalogSelect label="Nacionalidad" name="nacionalidad_id" required items={nacionalidades} value={values.nacionalidad_id} onChange={updateNationality}/>
            <Select label="Discapacidad" name="discapacidad" required options={["Sí","No"]} value={values.discapacidad} onChange={update}/>
            {values.discapacidad === "Sí" && <Field label="Tipo de discapacidad" name="tipoDiscapacidad" placeholder="Escribe el tipo de discapacidad" required value={values.tipoDiscapacidad} onChange={update}/>}
            <Select label="Nivel de educación" name="educacion" required options={["Básica","Bachillerato","Tercer nivel","Cuarto nivel","Sin estudios"]} value={values.educacion} onChange={update}/>
          </div>
        </div>}

        {step === 3 && <div className="consent">
          <div className="summary"><span aria-hidden="true">✓</span><div><strong>Tu información está lista</strong><p>Antes de finalizar, lee y acepta las condiciones.</p></div></div>
          <h3>Consentimiento y aceptación</h3>
          <p>Declaro que la información proporcionada es verídica y autorizo su uso exclusivamente para fines educativos y organizativos relacionados con los cursos de Formación Ciudadana del GAD Provincial de Manabí.</p>
          <p>Al enviar la preinscripción, acepto participar en el curso y manifiesto mi voluntad de forma libre e informada. Esta inscripción constituye una firma electrónica válida conforme a la Ley de Comercio Electrónico, Firmas Electrónicas y Mensajes de Datos del Ecuador.</p>
          <p>Autorizo el tratamiento de mis datos personales conforme a la Ley Orgánica de Protección de Datos Personales, y acepto que el GAD Provincial de Manabí pueda contactarme para notificaciones y seguimiento del proceso formativo.</p>
          <label className="check" htmlFor="acepto"><input id="acepto" type="checkbox" checked={Boolean(values.acepto)} onChange={e => update("acepto", e.target.checked)}/><span>Acepto los términos, el tratamiento de mis datos y las condiciones de participación. *</span></label>
        </div>}

        <div className="actions">
          <button type="button" className="text-btn" onClick={saveDraft}>Guardar borrador</button>
          <div>{step > 0 && <button type="button" className="secondary" onClick={() => setStep(step - 1)}>Atrás</button>}
          <button className="primary" type="submit" disabled={submitting}>{submitting && <span className="button-spinner" aria-hidden="true"></span>}{submitting ? "Enviando..." : step === 3 ? "Enviar preinscripción" : "Continuar"} {!submitting && <span aria-hidden="true">→</span>}</button></div>
        </div>
      </form>
    </section>}

    <footer><div className="footer-program"><strong>CAPACÍTATE MANABÍ</strong><p>Escuela de Formación Ciudadana y Liderazgo Territorial</p></div><a href={whatsappSupportUrl} target="_blank" rel="noreferrer">Soporte y contacto</a><p className="developer-credit"><span>Desarrollado por</span><a href="https://cacicustech.com/" target="_blank" rel="noreferrer"><strong>Cacicus</strong></a><i aria-hidden="true"></i><span>2026</span></p></footer>

    {done && <div className="modal" role="dialog" aria-modal="true" aria-labelledby="done-title"><div>
      <div className="success-status" aria-hidden="true"><span className="success-check"></span></div>
      <p className="eyebrow">PREINSCRIPCIÓN COMPLETADA</p>
      <h2 id="done-title">¡Gracias por ser parte del cambio!</h2>
      <p>Tu información fue enviada correctamente. Recibirás una copia en el correo registrado.</p>
      <button className="primary" onClick={resetAfterSuccess}>Aceptar</button>
    </div></div>}
  </main>;
}
