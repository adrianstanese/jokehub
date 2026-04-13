export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🤷</div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>Page Not Found</h1>
      <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 24 }}>This joke must have walked away...</p>
      <a href="/" style={{
        background: "var(--btn-gradient)", color: "#fff",
        borderRadius: 14, padding: "12px 24px", fontSize: 15, fontWeight: 650,
        textDecoration: "none", boxShadow: "var(--btn-shadow)",
      }}>← Back to Jokes Jar</a>
    </div>
  );
}
