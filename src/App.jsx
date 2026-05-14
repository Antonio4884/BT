import { useState } from "react";

// =======================
// EXTRAIR DADOS
// =======================
function extrairDados(linha) {
  const hostMatch = linha.match(/\s([a-zA-Z0-9\-]+)\s+Interface/);
  if (!hostMatch) return null;
  const host = hostMatch[1];

  const intfMatch = linha.match(/eth-(\d+\/\d+)/);
  if (!intfMatch) return null;
  const interface_ = intfMatch[1];

  let cli = "UNKNOWN";
  const cliMatch = linha.match(/CLI:([^\s#\)]*)/);
  if (cliMatch) {
    cli = cliMatch[1];
  } else {
    const altMatch = linha.match(/\(([^)]+)\)/);
    if (altMatch) cli = altMatch[1];
  }

  const partesCli = cli.split(/[\s*]/);
  cli = partesCli && partesCli[0] ? partesCli[0] : "UNKNOWN";

  return { host, interface: interface_, cli };
}

// =======================
// EXTRAIR HORA
// =======================
function extrairHora(texto) {
  const fullMatch = texto.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s+[AP]M)/i);
  if (fullMatch) {
    try {
      const dt = new Date(fullMatch[1]);
      if (!isNaN(dt)) {
        return dt.toLocaleString("pt-BR", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit", second: "2-digit",
          hour12: false,
        }).replace(",", "");
      }
    } catch (e) {
      console.warn("Falha ao parsear data completa:", fullMatch[1], e);
    }
  }

  const timeMatch = texto.match(/(\d{2}:\d{2}:\d{2}\s+[AP]M)/i);
  if (timeMatch) {
    try {
      const raw = timeMatch[1].toUpperCase();
      const [time, period] = raw.split(/\s+/);
      let [h, m, s] = time.split(":").map(Number);
      if (period === "PM" && h !== 12) h += 12;
      if (period === "AM" && h === 12) h = 0;
      const now = new Date();
      now.setHours(h, m, s);
      return now.toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        hour12: false,
      }).replace(",", "");
    } catch (e) {
      console.warn("Falha ao parsear hora:", timeMatch[1], e);
    }
  }

  console.info("Nenhuma data/hora encontrada; usando horário atual.");
  const now = new Date();
  return now.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).replace(",", "");
}

// =======================
// ORDENAR INTERFACE
// =======================
function ordenarInterface(iface) {
  const partes = iface.split("/");
  if (partes.length !== 2) {
    console.warn(`Formato de interface inesperado: '${iface}'. Usando (0, 0).`);
    return [0, 0];
  }
  const p1 = parseInt(partes[0], 10);
  const p2 = parseInt(partes[1], 10);
  if (isNaN(p1) || isNaN(p2)) {
    console.warn(`Não foi possível converter interface '${iface}' para inteiros.`);
    return [0, 0];
  }
  return [p1, p2];
}

// =======================
// PROCESSAR ALARMES
// =======================
function processarAlarmes(texto) {
  const dados = {};
  const hostsEncontrados = new Set();

  for (const linhaRaw of texto.split("\n")) {
    const linha = linhaRaw.trim();
    if (!linha) continue;

    const resultado = extrairDados(linha);
    if (!resultado) continue;

    const { host, interface: iface, cli } = resultado;
    hostsEncontrados.add(host);

    if (!dados[host]) dados[host] = new Map();
    dados[host].set(iface, cli);
  }

  if (Object.keys(dados).length === 0) {
    return "Nenhum alarme válido encontrado.";
  }

  const dataHora = extrairHora(texto);
  const equipamentos = [...hostsEncontrados].sort().join(", ");

  let saida = `-:CARIMBO DE ABERTURA - NOC:-.
Falha: Indisponibilidade em rede convencional/metro
Equipamento:
${equipamentos}
Alarme: loss
Data/Hora: ${dataHora} BRT
IP: XXXXXXXXXXXXXXX

41-3318-7732 - Op.4


`;

  for (const host of Object.keys(dados).sort()) {
    saida += `${host}\n`;

    const interfaces = [...dados[host].entries()].sort((a, b) => {
      const [a1, a2] = ordenarInterface(a[0]);
      const [b1, b2] = ordenarInterface(b[0]);
      return a1 !== b1 ? a1 - b1 : a2 - b2;
    });

    for (const [iface, cli] of interfaces) {
      saida += `${iface} CLI:${cli}\n`;
    }

    saida += "\n";
  }

  return saida.trim();
}

// =======================
// COMPONENTE PRINCIPAL
// =======================
export default function BTDestroyer() {
  const [entrada, setEntrada] = useState("");
  const [resultado, setResultado] = useState("");
  const [copied, setCopied] = useState(false);

  function handleProcessar() {
    if (!entrada.trim()) return;
    setResultado(processarAlarmes(entrada));
    setCopied(false);
  }

  function handleLimpar() {
    setEntrada("");
    setResultado("");
    setCopied(false);
  }

  async function handleCopiar() {
    if (!resultado) return;
    await navigator.clipboard.writeText(resultado);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={styles.root}>
      <style>{css}</style>

      <header style={styles.header}>
        <div style={styles.badge}>NOC TOOL</div>
        <h1 style={styles.title}>
          BT<span style={styles.accent}>-</span>Destroyer
        </h1>
        <p style={styles.subtitle}>Organizador de Alarmes · Interfaces</p>
      </header>

      <div style={styles.banner}>
        <span style={styles.bannerEmoji}>🤣</span>
        <span style={styles.bannerText}>Para a Bete não quebrar nada!</span>
        <span style={styles.bannerEmoji}>🤣</span>
        <img
          src="https://media.tenor.com/kFJXcs76sGkAAAAM/alien-probing.gif"
          alt="Alien Probing"
          style={{ height: "48px", borderRadius: "4px", verticalAlign: "middle" }}
        />
      </div>

      <main style={styles.main}>
        <section style={styles.card}>
          <label style={styles.label}>
            <span style={styles.labelDot} />
            Cole os alarmes aqui
          </label>
          <textarea
            style={styles.textarea}
            className="bt-textarea"
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
            placeholder="Cole o conteúdo dos alarmes..."
            spellCheck={false}
          />

          <div style={styles.actions}>
            <button
              style={{ ...styles.btn, ...styles.btnPrimary }}
              className="bt-btn-primary"
              onClick={handleProcessar}
              disabled={!entrada.trim()}
            >
              ⚡ Processar
            </button>
            <button
              style={{ ...styles.btn, ...styles.btnGhost }}
              className="bt-btn-ghost"
              onClick={handleLimpar}
            >
              🧹 Limpar
            </button>
          </div>
        </section>

        <section style={styles.card}>
          <div style={styles.resultHeader}>
            <label style={styles.label}>
              <span style={{ ...styles.labelDot, background: resultado ? "#00ffa3" : "#444" }} />
              Resultado
            </label>
            {resultado && (
              <button
                style={{ ...styles.btn, ...styles.btnCopy }}
                className="bt-btn-copy"
                onClick={handleCopiar}
              >
                {copied ? "✅ Copiado!" : "📋 Copiar"}
              </button>
            )}
          </div>
          <textarea
            style={{ ...styles.textarea, ...styles.textareaResult }}
            className="bt-textarea"
            value={resultado}
            readOnly
            placeholder="O resultado aparecerá aqui..."
            spellCheck={false}
          />
        </section>
      </main>

      <footer style={styles.footer}>
        BT-Destroyer · NOC Alarm Parser
      </footer>
    </div>
  );
}

// =======================
// ESTILOS
// =======================
const styles = {
  root: {
    minHeight: "100vh",
    background: "#0a0a0f",
    color: "#e0e0e0",
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    display: "flex",
    flexDirection: "column",
    padding: "0",
  },
  header: {
    padding: "2.5rem 2rem 1.5rem",
    borderBottom: "1px solid #1e1e2e",
    background: "linear-gradient(135deg, #0d0d1a 0%, #0a0a0f 100%)",
    position: "relative",
    overflow: "hidden",
  },
  badge: {
    display: "inline-block",
    fontSize: "0.65rem",
    letterSpacing: "0.2em",
    color: "#ff3c3c",
    border: "1px solid #ff3c3c44",
    padding: "2px 10px",
    borderRadius: "2px",
    marginBottom: "0.75rem",
    background: "#ff3c3c11",
  },
  title: {
    margin: 0,
    fontSize: "clamp(2rem, 5vw, 3.5rem)",
    fontWeight: 800,
    letterSpacing: "-0.03em",
    color: "#ffffff",
    lineHeight: 1,
    fontFamily: "'IBM Plex Mono', monospace",
  },
  accent: {
    color: "#ff3c3c",
  },
  subtitle: {
    margin: "0.5rem 0 0",
    fontSize: "0.75rem",
    color: "#555",
    letterSpacing: "0.15em",
    textTransform: "uppercase",
  },
  main: {
    flex: 1,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1.5rem",
    padding: "2rem",
    maxWidth: "1400px",
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box",
  },
  card: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  label: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.7rem",
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    color: "#666",
  },
  labelDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#ff3c3c",
    display: "inline-block",
    flexShrink: 0,
  },
  textarea: {
    flex: 1,
    minHeight: "320px",
    background: "#0e0e1a",
    border: "1px solid #1e1e2e",
    borderRadius: "4px",
    color: "#c8c8d4",
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: "0.78rem",
    lineHeight: 1.7,
    padding: "1rem",
    resize: "vertical",
    outline: "none",
    transition: "border-color 0.2s",
  },
  textareaResult: {
    background: "#080810",
    color: "#00ffa3",
  },
  actions: {
    display: "flex",
    gap: "0.75rem",
  },
  resultHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  btn: {
    padding: "0.6rem 1.4rem",
    fontSize: "0.75rem",
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: "0.08em",
    border: "none",
    borderRadius: "3px",
    cursor: "pointer",
    transition: "all 0.15s ease",
    fontWeight: 600,
  },
  btnPrimary: {
    background: "#ff3c3c",
    color: "#fff",
  },
  btnGhost: {
    background: "transparent",
    color: "#555",
    border: "1px solid #222",
  },
  btnCopy: {
    background: "transparent",
    color: "#00ffa3",
    border: "1px solid #00ffa322",
    padding: "0.3rem 0.9rem",
    fontSize: "0.7rem",
  },
  banner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.75rem",
    padding: "0.75rem 2rem",
    background: "linear-gradient(90deg, #1a0a00, #1f1200, #1a0a00)",
    borderBottom: "1px solid #ff3c3c33",
  },
  bannerText: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "#ffcc00",
    letterSpacing: "0.08em",
    fontFamily: "'IBM Plex Mono', monospace",
    textShadow: "0 0 12px #ffcc0066",
  },
  bannerEmoji: {
    fontSize: "1.3rem",
    animation: "shake 1.2s infinite",
  },
  footer: {
    padding: "1rem 2rem",
    borderTop: "1px solid #111",
    fontSize: "0.65rem",
    color: "#333",
    letterSpacing: "0.1em",
    textAlign: "center",
  },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;800&display=swap');

  * { box-sizing: border-box; }

  body {
    margin: 0;
    background: #0a0a0f;
  }

  .bt-textarea:focus {
    border-color: #ff3c3c55 !important;
    box-shadow: 0 0 0 3px #ff3c3c0d;
  }

  .bt-btn-primary:hover:not(:disabled) {
    background: #ff5555 !important;
    transform: translateY(-1px);
    box-shadow: 0 4px 16px #ff3c3c44;
  }

  .bt-btn-primary:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .bt-btn-ghost:hover {
    color: #aaa !important;
    border-color: #444 !important;
  }

  @keyframes shake {
    0%, 100% { transform: rotate(0deg); }
    20% { transform: rotate(-15deg); }
    40% { transform: rotate(15deg); }
    60% { transform: rotate(-10deg); }
    80% { transform: rotate(10deg); }
  }

  .bt-btn-copy:hover {
    background: #00ffa308 !important;
    border-color: #00ffa355 !important;
  }

  @media (max-width: 768px) {
    main {
      grid-template-columns: 1fr !important;
    }
  }
`;
