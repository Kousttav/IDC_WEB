// ════════════════════════════════════════════════════════════════
//  App.jsx  — IDC Admin Panel
//  Auth: JWT via /api/auth/login (hardcoded server-side users)
// ════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { io } from "socket.io-client";
import "./App.css";

const API = import.meta.env.VITE_API_URL;
const socket = io("http://localhost:5000");

// ── JWT token helpers ─────────────────────────────────────────
const TOKEN_KEY = "idc_admin_token";
const getToken  = ()        => localStorage.getItem(TOKEN_KEY);
const setToken  = (t)       => localStorage.setItem(TOKEN_KEY, t);
const clearToken = ()       => localStorage.removeItem(TOKEN_KEY);

// Decode username from JWT payload (no library needed — just base64)
function decodeUsername(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.username || "Admin";
  } catch {
    return "Admin";
  }
}

// ── Authenticated fetch wrapper ────────────────────────────────
// GET requests don't need a token (public read routes).
// Every mutating method (POST, PUT, PATCH, DELETE) attaches Bearer.
async function authFetch(url, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = { ...(options.headers || {}) };

  if (method !== "GET") {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  return fetch(url, { ...options, headers });
}

const TAB_META = {
  dashboard:     { title: "Dashboard",     sub: "OVERVIEW" },
  players:       { title: "Players",       sub: "ROSTER MANAGEMENT" },
  upload:        { title: "Import Excel",  sub: "EXCEL IMPORT" },
  achievements:  { title: "Achievements",  sub: "TROPHY ROOM" },
  gallery:       { title: "Gallery",       sub: "MEDIA LIBRARY" },
  tournaments:   { title: "Tournaments",   sub: "SCHEDULE" },
  contacts:      { title: "Contacts",      sub: "MESSAGES" },
  notifications: { title: "Notifications", sub: "ALERTS" },
  settings:      { title: "Settings",      sub: "CONFIGURATION" },
};

const STATUS_COLORS = {
  unread:  { bg: "rgba(255,30,0,0.15)",   border: "rgba(255,30,0,0.5)",    text: "#ff4422" },
  read:    { bg: "rgba(200,151,42,0.12)", border: "rgba(200,151,42,0.45)", text: "#c8972a" },
  replied: { bg: "rgba(80,200,120,0.12)", border: "rgba(80,200,120,0.45)", text: "#50c878" },
};

// ════════════════════════════════════════════════════════════════
//  TOAST HOOK
// ════════════════════════════════════════════════════════════════
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const showToast = useCallback((msg, type = "") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3300);
  }, []);
  return { toasts, showToast };
}

const emptyPlayer     = { ign: "", name: "", email: "", contact: "", address: "", image: "", instagram: "", bio: "" };
const emptyAchieve    = { icon: "", date: "", title: "", desc: "", badge: "" };
const emptyTournament = { name: "", game: "eFootball", status: "upcoming", date: "TBD", prizePool: "TBD", format: "TBD" };

// ════════════════════════════════════════════════════════════════
//  LOGIN  — calls /api/auth/login, stores JWT
// ════════════════════════════════════════════════════════════════
function LoginScreen({ onLogin }) {
  const [user,    setUser]    = useState("");
  const [pass,    setPass]    = useState("");
  const [showPw,  setShowPw]  = useState(false);
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!user.trim() || !pass.trim()) {
      setError("Please enter username and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res  = await fetch(`${API}/auth/login`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ username: user.trim(), password: pass }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid credentials.");
        setLoading(false);
        return;
      }

      setToken(data.token);
      onLogin(decodeUsername(data.token));
    } catch {
      setError("Cannot reach server. Is it running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-box">
        <div className="login-logo">
          <div className="idc-badge">IDC</div>
          <h1>ADMIN PANEL</h1>
          <p>Immortal De Campeones</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <div className="login-field">
          <label>Username</label>
          <div className="login-field-wrap">
            <input
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="Enter your username"
              autoComplete="username"
            />
          </div>
        </div>

        <div className="login-field">
          <label>Password</label>
          <div className="login-field-wrap">
            <input
              type={showPw ? "text" : "password"}
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
            <button className="toggle-pw" onClick={() => setShowPw((p) => !p)}>
              <i className={`fas ${showPw ? "fa-eye-slash" : "fa-eye"}`}></i>
            </button>
          </div>
        </div>

        <button className="login-btn" onClick={handleLogin} disabled={loading}>
          {loading
            ? <><i className="fas fa-spinner fa-spin"></i> Authenticating...</>
            : <>Access Dashboard <i className="fas fa-arrow-right"></i></>}
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  SIDEBAR
// ════════════════════════════════════════════════════════════════
function Sidebar({ activeTab, setActiveTab, adminName, onLogout, playerCount, sidebarOpen, unreadCount, unreadContactCount }) {
  const navItem = (tab, icon, label, badge) => (
    <div className={`nav-item${activeTab === tab ? " active" : ""}`} onClick={() => setActiveTab(tab)}>
      <i className={`nav-icon fas ${icon}`}></i>
      <span className="nav-label">{label}</span>
      {badge !== undefined && badge > 0 && <span className="nav-badge">{badge}</span>}
    </div>
  );
  return (
    <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">IDC</div>
        <div className="sidebar-title">Admin Panel<small>IMMORTAL DE CAMPEONES</small></div>
      </div>
      <nav className="sidebar-nav">
        <div className="nav-section">
          <div className="nav-section-label">Overview</div>
          {navItem("dashboard", "fa-th-large", "Dashboard")}
        </div>
        <div className="nav-section">
          <div className="nav-section-label">Content</div>
          {navItem("players",      "fa-users",      "Players",     playerCount)}
          {navItem("upload",       "fa-file-excel", "Import Excel")}
          {navItem("achievements", "fa-trophy",     "Achievements")}
          {navItem("gallery",      "fa-images",     "Gallery")}
          {navItem("tournaments",  "fa-gamepad",    "Tournaments")}
        </div>
        <div className="nav-section">
          <div className="nav-section-label">Inbox</div>
          {navItem("contacts", "fa-envelope", "Contacts", unreadContactCount)}
        </div>
        <div className="nav-section">
          <div className="nav-section-label">System</div>
          {navItem("notifications", "fa-bell", "Notifications", unreadCount)}
          {navItem("settings",      "fa-cog",  "Settings")}
          <div className="nav-item" onClick={() => window.open("http://localhost:5173", "_blank")}>
            <i className="nav-icon fas fa-external-link-alt"></i>
            <span className="nav-label">View Website</span>
          </div>
        </div>
      </nav>
      <div className="sidebar-footer">
        <div className="admin-user">
          <div className="admin-avatar"><i className="fas fa-user-shield"></i></div>
          <div className="admin-info">
            <span title={adminName} style={{ fontSize: adminName.length > 16 ? "0.65rem" : undefined }}>
              {adminName.length > 20 ? adminName.slice(0, 18) + "…" : adminName}
            </span>
            <small>IDC Admin</small>
          </div>
          <button className="logout-btn" onClick={onLogout} title="Logout">
            <i className="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </div>
    </aside>
  );
}

// ════════════════════════════════════════════════════════════════
//  TOPBAR
// ════════════════════════════════════════════════════════════════
function Topbar({ activeTab, setActiveTab, unreadCount, unreadContactCount }) {
  const meta = TAB_META[activeTab] || { title: activeTab, sub: "" };
  return (
    <div className="topbar">
      <div className="topbar-left">
        <div className="page-title">{meta.title}<small>{meta.sub}</small></div>
      </div>
      <div className="topbar-right">
        <a href="http://localhost:5173" target="_blank" rel="noreferrer" className="topbar-btn">
          <i className="fas fa-eye"></i> View Site
        </a>
        <button className="topbar-btn primary" onClick={() => setActiveTab("upload")}>
          <i className="fas fa-upload"></i> Import Excel
        </button>
        <button className="notif-btn" onClick={() => setActiveTab("contacts")} title="Contact Messages" style={{ position: "relative" }}>
          <i className="fas fa-envelope"></i>
          {unreadContactCount > 0 && <div className="notif-dot"></div>}
        </button>
        <button className="notif-btn" onClick={() => setActiveTab("notifications")} style={{ position: "relative" }}>
          <i className="fas fa-bell"></i>
          {unreadCount > 0 && <div className="notif-dot"></div>}
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  DASHBOARD TAB
// ════════════════════════════════════════════════════════════════
function DashboardTab({ players, galleryCount, achievementCount, tournamentCount, unreadContactCount, setActiveTab, notifications }) {
  const recent = notifications.slice(0, 3);
  return (
    <div>
      <div className="stats-row">
        {[
          { icon: "fa-users",    col: "rgba(200,151,42,0.1)", c: "var(--gold)",     val: players.length,     lbl: "Total Players" },
          { icon: "fa-trophy",   col: "rgba(255,58,42,0.1)",  c: "var(--dragon-1)", val: achievementCount,   lbl: "Tournament Wins" },
          { icon: "fa-images",   col: "rgba(52,152,219,0.1)", c: "var(--info)",     val: galleryCount,       lbl: "Gallery Items" },
          { icon: "fa-gamepad",  col: "rgba(46,204,113,0.1)", c: "var(--success)",  val: tournamentCount,    lbl: "Tournaments Listed" },
          { icon: "fa-envelope", col: "rgba(255,30,0,0.1)",   c: "#ff4422",         val: unreadContactCount, lbl: "Unread Messages" },
        ].map(({ icon, col, c, val, lbl }) => (
          <div className="stat-card" key={lbl}>
            <div className="stat-card-top">
              <div className="stat-card-icon" style={{ background: col, color: c }}>
                <i className={`fas ${icon}`}></i>
              </div>
              <span className="stat-card-change up">+{val} ↑</span>
            </div>
            <div className="stat-val">{val}</div>
            <div className="stat-lbl">{lbl}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <div className="panel panel-dash">
          <div className="panel-head">
            <h3><i className="fas fa-users"></i> Recent Players</h3>
            <button className="tbl-btn view" onClick={() => setActiveTab("players")}
              style={{ padding: "10px 20px", fontFamily: "var(--font-hd)", fontSize: "0.6rem", letterSpacing: "0.1em" }}>
              View All
            </button>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            <table className="data-table">
              <thead><tr><th></th><th>IGN</th><th>Role</th><th>Status</th></tr></thead>
              <tbody>
                {players.slice(0, 5).map((p) => (
                  <tr key={p._id}>
                    <td><div className="player-thumb"><i className="fas fa-user-ninja" style={{ color: "var(--gold-dim)" }}></i></div></td>
                    <td><div className="ign" style={{ fontFamily: "var(--font-hd)", fontSize: "0.8rem", color: "var(--gold-light)" }}>{p.ign}</div></td>
                    <td>
                      {p.role === "admin"
                        ? <span className="badge badge-gold" style={{ fontSize: "0.6rem" }}>⭐ ADMIN</span>
                        : <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontFamily: "var(--font-hd)" }}>PLAYER</span>}
                    </td>
                    <td><span className="badge badge-active">Active</span></td>
                  </tr>
                ))}
                {players.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--text-muted)", padding: "1.5rem", fontFamily: "var(--font-alt)" }}>No players yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel panel-dash">
          <div className="panel-head">
            <h3><i className="fas fa-bell"></i> Notifications</h3>
            <button className="tbl-btn view" onClick={() => setActiveTab("notifications")}
              style={{ padding: "10px 20px", fontFamily: "var(--font-hd)", fontSize: "0.6rem", letterSpacing: "0.1em" }}>
              View All
            </button>
          </div>
          <div className="panel-body" style={{ padding: "0.5rem 1rem" }}>
            {recent.length === 0
              ? <div style={{ textAlign: "center", padding: "1.5rem", color: "var(--text-muted)", fontFamily: "var(--font-alt)", fontSize: "0.85rem" }}>No notifications yet.</div>
              : recent.map((n, i) => (
                  <div key={n.id} style={{ display: "flex", alignItems: "flex-start", gap: "0.9rem", padding: "0.85rem 0", borderBottom: i < recent.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--bg-raised)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <i className={`fas ${n.icon}`} style={{ color: n.color, fontSize: "0.85rem" }}></i>
                    </div>
                    <div>
                      <div style={{ fontFamily: "var(--font-alt)", fontSize: "0.83rem", color: "var(--text)", lineHeight: 1.4 }}>{n.msg}</div>
                      <div style={{ fontFamily: "var(--font-hd)", fontSize: "0.6rem", letterSpacing: "0.12em", color: "var(--text-muted)", marginTop: 4 }}>{n.time}</div>
                    </div>
                  </div>
                ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  PLAYERS TAB
// ════════════════════════════════════════════════════════════════
function PlayersTab({ players, setPlayers, showToast, addNotification }) {
  const [search,    setSearch]    = useState("");
  const [showForm,  setShowForm]  = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form,      setForm]      = useState(emptyPlayer);
  const formRef = useRef(null);

  const filtered = players.filter((p) =>
    !search ||
    p.ign.toLowerCase().includes(search.toLowerCase()) ||
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditingId(null); setForm(emptyPlayer); setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };
  const openEdit = (id) => {
    const p = players.find((x) => x._id === id);
    if (!p) return;
    setEditingId(id);
    setForm({ ign: p.ign || "", name: p.name || "", email: p.email || "", contact: p.contact || "", address: p.address || "", image: p.image || "", instagram: p.social?.instagram || "", bio: p.bio || "" });
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const toggleRole = async (id) => {
    const p = players.find((x) => x._id === id);
    if (!p) return;
    const newRole = p.role === "admin" ? "player" : "admin";
    const label   = newRole === "admin" ? "promoted to Admin" : "set back to Player";
    try {
      const res     = await authFetch(`${API}/players/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: newRole }) });
      const updated = await res.json();
      setPlayers((prev) => prev.map((x) => x._id === id ? updated : x));
      showToast(`${p.ign} ${label}!`, newRole === "admin" ? "success" : "");
      addNotification(`${p.ign} was ${label}.`, "fa-shield-alt", newRole === "admin" ? "var(--gold)" : "var(--text-muted)");
    } catch (err) {
      console.error(err); showToast("Failed to update role.", "danger");
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("image", file);
    try {
      const res  = await authFetch(`${API}/gallery/upload`, { method: "POST", body: fd });
      const data = await res.json();
      setForm((prev) => ({ ...prev, image: data.imageUrl }));
      showToast("Image uploaded!", "success");
    } catch (err) {
      console.log(err); showToast("Upload failed", "danger");
    }
  };

  const savePlayer = async () => {
    if (!form.ign.trim() || !form.name.trim()) { showToast("IGN and Name are required.", "danger"); return; }
    const data = { ign: form.ign.trim(), name: form.name.trim(), email: form.email, contact: form.contact, address: form.address, image: form.image, bio: form.bio, social: { instagram: form.instagram }, active: true };
    try {
      if (editingId) {
        await authFetch(`${API}/players/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        showToast("Player updated!", "success");
        addNotification(`Player "${form.ign}" was updated.`, "fa-user-edit", "var(--info)");
      } else {
        await authFetch(`${API}/players`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        showToast("Player added!", "success");
        addNotification(`New player "${form.ign}" added.`, "fa-user-plus", "var(--success)");
      }
      const res = await fetch(`${API}/players`);
      setPlayers(await res.json());
      setShowForm(false); setEditingId(null);
    } catch (err) {
      console.log(err); showToast("Failed to save player", "danger");
    }
  };

  const deletePlayer = async (id) => {
    const p = players.find((x) => x._id === id);
    if (!window.confirm("Delete this player?")) return;
    try {
      await authFetch(`${API}/players/${id}`, { method: "DELETE" });
      setPlayers((prev) => prev.filter((x) => x._id !== id));
      showToast("Player removed.", "danger");
      addNotification(`Player "${p?.ign}" removed.`, "fa-user-minus", "var(--danger)");
    } catch (err) {
      console.log(err); showToast("Delete failed", "danger");
    }
  };

  const f = (key) => ({ value: form[key], onChange: (e) => setForm((prev) => ({ ...prev, [key]: e.target.value })) });

  return (
    <div>
      <div className="panel">
        <div className="panel-head">
          <h3><i className="fas fa-users"></i> Player Roster</h3>
          <button className="btn-save" style={{ padding: "8px 18px" }} onClick={openAdd}>
            <i className="fas fa-plus"></i> Add Player
          </button>
        </div>
        <div className="panel-body" style={{ paddingBottom: 0 }}>
          <div style={{ position: "relative", maxWidth: 380 }}>
            <i className="fas fa-search" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--silver-dim)" }}></i>
            <input type="text" placeholder="Search players..." value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", padding: "9px 16px 9px 36px", background: "var(--bg-raised)", border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--text)", outline: "none" }} />
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr><th></th><th>IGN</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p._id}>
                  <td>
                    {p.image
                      ? <div className="player-thumb"><img src={p.image} alt={p.ign} style={{ width: 34, height: 34, objectFit: "cover", borderRadius: "50%" }} /></div>
                      : <div className="player-thumb"><i className="fas fa-user-ninja" style={{ color: "var(--gold-dim)" }}></i></div>}
                  </td>
                  <td>
                    <div className="player-cell">
                      <div className="player-cell-info">
                        <div className="ign">{p.ign}</div>
                        <div className="rname">{p.name}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>{p.email}</td>
                  <td>
                    {p.role === "admin"
                      ? <span className="badge badge-gold" style={{ fontSize: "0.62rem" }}>⭐ ADMIN</span>
                      : <span style={{ color: "var(--text-muted)", fontSize: "0.72rem", fontFamily: "var(--font-hd)", letterSpacing: "0.1em" }}>PLAYER</span>}
                  </td>
                  <td><span className={`badge ${p.active ? "badge-active" : "badge-inactive"}`}>{p.active ? "Active" : "Inactive"}</span></td>
                  <td>
                    <div className="tbl-actions">
                      <button className="tbl-btn" title={p.role === "admin" ? "Remove Admin" : "Set as Admin"} onClick={() => toggleRole(p._id)}
                        style={{ borderColor: p.role === "admin" ? "var(--gold)" : "var(--border)", color: p.role === "admin" ? "var(--gold)" : "var(--text-muted)", background: p.role === "admin" ? "rgba(200,151,42,0.1)" : "transparent" }}>
                        <i className={`fas ${p.role === "admin" ? "fa-shield-alt" : "fa-shield"}`}></i>
                      </button>
                      <button className="tbl-btn edit" onClick={() => openEdit(p._id)} title="Edit"><i className="fas fa-edit"></i></button>
                      <button className="tbl-btn del"  onClick={() => deletePlayer(p._id)} title="Delete"><i className="fas fa-trash"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="panel" ref={formRef}>
          <div className="panel-head">
            <h3>{editingId ? <><i className="fas fa-edit"></i> Edit Player</> : <><i className="fas fa-plus"></i> Add New Player</>}</h3>
            <button className="tbl-btn" onClick={() => setShowForm(false)}><i className="fas fa-times"></i></button>
          </div>
          <div className="panel-body">
            <div className="form-grid">
              <div className="form-group"><label>In-Game Name (IGN)*</label><input type="text" placeholder="PhantomX" {...f("ign")} /></div>
              <div className="form-group"><label>Real Name*</label><input type="text" placeholder="Arjun Sharma" {...f("name")} /></div>
              <div className="form-group"><label>Email</label><input type="email" placeholder="player@idc.gg" {...f("email")} /></div>
              <div className="form-group"><label>Contact Number</label><input type="text" placeholder="+91 98765 43210" {...f("contact")} /></div>
              <div className="form-group"><label>Address / City</label><input type="text" placeholder="Mumbai, Maharashtra" {...f("address")} /></div>
              <div className="form-group form-full">
                <label>Profile Image</label>
                <div className="upload-zone">
                  <input type="file" accept="image/*" onChange={handleImageUpload} />
                  <div className="upload-icon"><i className="fas fa-image"></i></div>
                  <div className="upload-title">DRAG & DROP IMAGE</div>
                  <div className="upload-hint">or click to upload from device</div>
                </div>
                {form.image && <img src={form.image} alt="preview" style={{ width: "120px", height: "120px", objectFit: "cover", borderRadius: "12px", marginTop: "1rem", border: "1px solid var(--border)" }} />}
              </div>
              <div className="form-group"><label>Instagram URL</label><input type="text" placeholder="https://instagram.com/..." {...f("instagram")} /></div>
              <div className="form-group form-full"><label>Player Bio</label><textarea placeholder="Brief biography..." {...f("bio")}></textarea></div>
            </div>
            <div className="form-actions">
              <button className="btn-cancel" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn-save" onClick={savePlayer}><i className="fas fa-save"></i> Save Player</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  UPLOAD TAB
// ════════════════════════════════════════════════════════════════
function UploadTab({ showToast, fetchPlayers, addNotification }) {
  const [isDragOver,    setIsDragOver]    = useState(false);
  const [progress,      setProgress]      = useState(null);
  const [progressLabel, setProgressLabel] = useState("PROCESSING...");
  const [importLog,     setImportLog]     = useState(null);

  const handleFile = async (file) => {
    if (!file) return;
    setProgress(0); setProgressLabel("READING FILE...");
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data     = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet    = workbook.Sheets[workbook.SheetNames[0]];
        const json     = XLSX.utils.sheet_to_json(sheet);
        if (!json.length) { showToast("Excel file is empty!", "danger"); setProgress(null); return; }
        let imported = 0, failed = 0;
        for (let i = 0; i < json.length; i++) {
          const row = json[i];
          setProgress(Math.round(((i + 1) / json.length) * 100));
          setProgressLabel(`IMPORTING ${i + 1} / ${json.length}...`);
          const playerData = {
            ign:     row["In-Game Name"]    || "",
            name:    row["Player Name"]     || "",
            address: row["Address"]         || "",
            contact: row["Contact Number"]  || "",
            email:   row["Email"]           || "",
            bio:     row["Player Bio"]      || "",
            image:   row["Profile Picture"] || "",
            social:  { instagram: row["Instagram"] || "" },
            active:  true,
          };
          try {
            const res = await authFetch(`${API}/players`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(playerData) });
            if (res.ok) imported++; else failed++;
          } catch { failed++; }
        }
        setProgress(100); setProgressLabel("IMPORT COMPLETE!");
        setImportLog({ count: imported, failed, name: file.name, size: (file.size / 1024).toFixed(1), time: new Date().toLocaleTimeString() });
        await fetchPlayers();
        showToast(`${imported} player(s) imported!${failed ? ` (${failed} failed)` : ""}`, imported > 0 ? "success" : "danger");
        addNotification(`${imported} player(s) imported from "${file.name}".`, "fa-file-excel", "var(--gold)");
      } catch (err) {
        console.error(err); showToast("Import failed.", "danger"); setProgress(null);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadSample = () => {
    const headers = ["Player Name","In-Game Name","Address","Contact Number","Email","Player Bio","Instagram","Profile Picture"];
    const sample  = ["Arjun Sharma","PhantomX","Mumbai, Maharashtra","+91 98765 43210","arjun@idc.gg","Captain and IGL.","https://instagram.com/","https://drive.google.com/file/d/FILE_ID/view"];
    const csv = [headers, sample].map((r) => r.join(",")).join("\n");
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })), download: "IDC_Players_Sample.csv" });
    a.click(); showToast("Sample CSV downloaded!", "success");
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
      <div>
        <div className="panel">
          <div className="panel-head"><h3><i className="fas fa-file-upload"></i> Upload Excel Sheet</h3></div>
          <div className="panel-body">
            <div className={`upload-zone${isDragOver ? " dragover" : ""}`}
              onDragEnter={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragOver={(e)  => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
              onDrop={(e)      => { e.preventDefault(); setIsDragOver(false); handleFile(e.dataTransfer.files[0]); }}>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => handleFile(e.target.files[0])} />
              <div className="upload-icon"><i className="fas fa-file-excel"></i></div>
              <div className="upload-title">DROP EXCEL FILE HERE</div>
              <div className="upload-hint">Supports .xlsx, .xls, .csv</div>
              {progress !== null && (
                <div className="upload-progress">
                  <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }}></div></div>
                  <div className="progress-label">{progressLabel}</div>
                </div>
              )}
            </div>
            <div style={{ marginTop: "1.5rem", padding: "1rem", background: "var(--bg-raised)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius)" }}>
              <div style={{ fontFamily: "var(--font-hd)", fontSize: "0.62rem", letterSpacing: "0.15em", color: "var(--gold)", marginBottom: "0.8rem" }}>📋 REQUIRED COLUMNS</div>
              <div style={{ fontFamily: "var(--font-alt)", fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 2 }}>
                Player Name · In-Game Name · Address · Contact Number · Email · Player Bio · Instagram · Profile Picture
              </div>
            </div>
            <button className="btn-save" style={{ width: "100%", marginTop: "1rem" }} onClick={downloadSample}>
              <i className="fas fa-download"></i> Download Sample CSV
            </button>
          </div>
        </div>
      </div>
      <div>
        <div className="panel">
          <div className="panel-head"><h3><i className="fas fa-table"></i> Column Schema</h3></div>
          <div className="panel-body" style={{ padding: 0, overflowX: "auto" }}>
            <table className="schema-table">
              <thead><tr><th>Column</th><th>Type</th><th>Example</th></tr></thead>
              <tbody>
                {[["Player Name","Text","Arjun Sharma"],["In-Game Name","Text","PhantomX"],["Address","Text","Mumbai"],["Contact Number","Text","+91 98765"],["Email","Email","arjun@idc.gg"],["Player Bio","Text","Description..."],["Instagram","URL","https://..."],["Profile Picture","Drive URL","https://drive.google.com/..."]].map(([col, type, ex]) => (
                  <tr key={col}><td><code>{col}</code></td><td>{type}</td><td>{ex}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><h3><i className="fas fa-history"></i> Import Log</h3></div>
          <div className="panel-body">
            {importLog ? (
              <div style={{ padding: "0.8rem", background: "rgba(46,204,113,0.08)", border: "1px solid rgba(46,204,113,0.2)", borderRadius: 8 }}>
                <div style={{ fontFamily: "var(--font-hd)", fontSize: "0.65rem", letterSpacing: "0.15em", color: "var(--success)" }}>✅ IMPORT SUCCESSFUL</div>
                <div style={{ fontFamily: "var(--font-alt)", fontSize: "0.85rem", color: "var(--text)", marginTop: "0.4rem" }}>
                  {importLog.count} player(s) from <strong>{importLog.name}</strong>
                  {importLog.failed > 0 && <span style={{ color: "var(--danger)", marginLeft: 8 }}>· {importLog.failed} failed</span>}
                </div>
                <div style={{ fontFamily: "var(--font-alt)", fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>{importLog.size} KB · {importLog.time}</div>
              </div>
            ) : (
              <div style={{ fontFamily: "var(--font-alt)", fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center", padding: "1rem" }}>No imports yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  ACHIEVEMENTS TAB
// ════════════════════════════════════════════════════════════════
function AchievementsTab({ achievements, setAchievements, fetchAchievements, showToast, addNotification }) {
  const [showForm,  setShowForm]  = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form,      setForm]      = useState(emptyAchieve);

  const openAdd  = () => { setEditingId(null); setForm(emptyAchieve); setShowForm(true); };
  const openEdit = (id) => {
    const a = achievements.find((x) => x._id === id);
    if (!a) return;
    setEditingId(id);
    setForm({ icon: a.icon, date: a.date, title: a.title, desc: a.desc, badge: a.badge });
    setShowForm(true);
  };
  const save = async () => {
    if (!form.title.trim()) { showToast("Title is required.", "danger"); return; }
    const data = { icon: form.icon || "🏆", date: form.date, title: form.title, desc: form.desc, badge: form.badge };
    try {
      if (editingId) {
        const res     = await authFetch(`${API}/achievements/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        const updated = await res.json();
        setAchievements((prev) => prev.map((a) => a._id === editingId ? updated : a));
        showToast("Achievement updated!", "success");
        addNotification(`Achievement "${form.title}" updated.`, "fa-trophy", "var(--gold)");
      } else {
        const res     = await authFetch(`${API}/achievements`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        const created = await res.json();
        setAchievements((prev) => [created, ...prev]);
        showToast("Achievement added!", "success");
        addNotification(`Achievement "${form.title}" added.`, "fa-trophy", "var(--gold)");
      }
      setShowForm(false);
    } catch (err) {
      console.error(err); showToast("Unable to save.", "danger"); await fetchAchievements();
    }
  };
  const del = async (id) => {
    const a = achievements.find((x) => x._id === id);
    if (!window.confirm("Delete achievement?")) return;
    try {
      await authFetch(`${API}/achievements/${id}`, { method: "DELETE" });
      setAchievements((prev) => prev.filter((x) => x._id !== id));
      showToast("Achievement deleted.", "danger");
      addNotification(`Achievement "${a?.title}" deleted.`, "fa-trophy", "var(--danger)");
    } catch (err) {
      console.error(err); showToast("Unable to delete.", "danger"); await fetchAchievements();
    }
  };
  const f = (key) => ({ value: form[key], onChange: (e) => setForm((prev) => ({ ...prev, [key]: e.target.value })) });

  return (
    <div>
      <div className="panel">
        <div className="panel-head">
          <h3><i className="fas fa-trophy"></i> Achievements</h3>
          <button className="btn-save" style={{ padding: "8px 18px" }} onClick={openAdd}><i className="fas fa-plus"></i> Add Achievement</button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead><tr><th>Icon</th><th>Title</th><th>Date</th><th>Badge</th><th>Actions</th></tr></thead>
            <tbody>
              {achievements.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)", padding: "1.5rem", fontFamily: "var(--font-alt)" }}>No achievements yet.</td></tr>
              )}
              {achievements.map((a) => (
                <tr key={a._id}>
                  <td style={{ fontSize: "1.3rem" }}>{a.icon}</td>
                  <td style={{ color: "var(--text)" }}>{a.title}</td>
                  <td style={{ color: "var(--gold)", fontFamily: "var(--font-hd)", fontSize: "0.7rem" }}>{a.date}</td>
                  <td><span className="badge badge-gold">{a.badge}</span></td>
                  <td>
                    <div className="tbl-actions">
                      <button className="tbl-btn edit" onClick={() => openEdit(a._id)}><i className="fas fa-edit"></i></button>
                      <button className="tbl-btn del"  onClick={() => del(a._id)}><i className="fas fa-trash"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showForm && (
        <div className="panel">
          <div className="panel-head">
            <h3>{editingId ? <><i className="fas fa-edit"></i> Edit Achievement</> : <><i className="fas fa-plus"></i> Add Achievement</>}</h3>
            <button className="tbl-btn" onClick={() => setShowForm(false)}><i className="fas fa-times"></i></button>
          </div>
          <div className="panel-body">
            <div className="form-grid">
              <div className="form-group"><label>Icon (Emoji)</label><input type="text" placeholder="🏆" {...f("icon")} /></div>
              <div className="form-group"><label>Date</label><input type="text" placeholder="NOV 2024" {...f("date")} /></div>
              <div className="form-group form-full"><label>Title*</label><input type="text" placeholder="Regional Championship 2024" {...f("title")} /></div>
              <div className="form-group form-full"><label>Description</label><textarea placeholder="Achievement description..." {...f("desc")}></textarea></div>
              <div className="form-group"><label>Badge Text</label><input type="text" placeholder="1st Place" {...f("badge")} /></div>
            </div>
            <div className="form-actions">
              <button className="btn-cancel" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn-save" onClick={save}><i className="fas fa-save"></i> {editingId ? "Update" : "Save"} Achievement</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  GALLERY TAB
// ════════════════════════════════════════════════════════════════
function GalleryTab({ gallery, setGallery, showToast, fetchGallery, addNotification }) {
  const [showForm,   setShowForm]   = useState(false);
  const [caption,    setCaption]    = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading,  setUploading]  = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileRef = useRef(null);

  const handleFileChange = async (file) => {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("image", file);
    try {
      const res  = await authFetch(`${API}/gallery/upload`, { method: "POST", body: fd });
      const data = await res.json();
      setPreviewUrl(data.imageUrl);
      showToast("Image ready — click Save.", "success");
    } catch (err) {
      console.error(err); showToast("Upload failed.", "danger");
    } finally {
      setUploading(false);
    }
  };

  const saveItem = async () => {
    if (!previewUrl) { showToast("Please select an image first.", "danger"); return; }
    try {
      const res     = await authFetch(`${API}/gallery`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ src: previewUrl, caption: caption.trim() }) });
      const created = await res.json();
      setGallery((prev) => [created, ...prev]);
      showToast("Gallery image added!", "success");
      addNotification(`Gallery image${caption ? ` "${caption}"` : ""} added.`, "fa-images", "var(--info)");
      cancelForm();
    } catch (err) {
      console.error(err); showToast("Unable to save.", "danger"); await fetchGallery();
    }
  };

  const cancelForm = () => {
    setShowForm(false); setCaption(""); setPreviewUrl("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeItem = async (id) => {
    if (!window.confirm("Remove this image?")) return;
    try {
      await authFetch(`${API}/gallery/${id}`, { method: "DELETE" });
      setGallery((prev) => prev.filter((g) => g._id !== id));
      showToast("Image removed.", "danger");
      addNotification("Gallery image removed.", "fa-images", "var(--danger)");
    } catch (err) {
      console.error(err); showToast("Unable to remove.", "danger"); await fetchGallery();
    }
  };

  return (
    <div>
      <div className="panel">
        <div className="panel-head">
          <h3><i className="fas fa-images"></i> Gallery Management</h3>
          {!showForm && (
            <button className="btn-save" style={{ padding: "8px 18px" }} onClick={() => setShowForm(true)}>
              <i className="fas fa-plus"></i> Add Image
            </button>
          )}
        </div>
        <div className="panel-body">
          <div className="gallery-admin-grid">
            {gallery.length === 0 && !showForm && (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "2rem", color: "var(--text-muted)", fontFamily: "var(--font-alt)" }}>
                No gallery images yet. Click "Add Image" to upload.
              </div>
            )}
            {gallery.map((item) => {
              const src = item.src || item.image || "";
              return (
                <div className="gallery-admin-item" key={item._id || src}>
                  {src
                    ? <img src={src} alt={item.caption} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <div className="gallery-admin-placeholder"><i className="fas fa-image"></i></div>}
                  <div className="gallery-admin-overlay">
                    {item._id && (
                      <button className="tbl-btn del" onClick={() => removeItem(item._id)}
                        style={{ background: "rgba(231,76,60,0.2)", borderColor: "var(--danger)", color: "var(--danger)" }}>
                        <i className="fas fa-trash"></i>
                      </button>
                    )}
                  </div>
                  {item.caption && <div className="gallery-caption">{item.caption}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showForm && (
        <div className="panel">
          <div className="panel-head">
            <h3><i className="fas fa-plus"></i> Add New Image</h3>
            <button className="tbl-btn" onClick={cancelForm}><i className="fas fa-times"></i></button>
          </div>
          <div className="panel-body">
            <div className="form-grid">
              <div className="form-group form-full">
                <label>Image File</label>
                <div className={`upload-zone${isDragOver ? " dragover" : ""}`}
                  onDragEnter={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragOver={(e)  => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
                  onDrop={(e)      => { e.preventDefault(); setIsDragOver(false); handleFileChange(e.dataTransfer.files[0]); }}>
                  <input type="file" accept="image/*" ref={fileRef} onChange={(e) => handleFileChange(e.target.files[0])} />
                  <div className="upload-icon">
                    {uploading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-image"></i>}
                  </div>
                  <div className="upload-title">{uploading ? "UPLOADING..." : "DRAG & DROP OR CLICK TO UPLOAD"}</div>
                  <div className="upload-hint">JPG, PNG, WEBP — max 5 MB</div>
                </div>
                {previewUrl && (
                  <img src={previewUrl} alt="preview"
                    style={{ width: 140, height: 140, objectFit: "cover", borderRadius: 10, marginTop: "1rem", border: "1px solid var(--border)" }} />
                )}
              </div>
              <div className="form-group form-full">
                <label>Caption <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span></label>
                <input type="text" placeholder="e.g. Regional Finals 2024" value={caption} onChange={(e) => setCaption(e.target.value)} />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn-cancel" onClick={cancelForm}>Cancel</button>
              <button className="btn-save" onClick={saveItem} disabled={uploading || !previewUrl}>
                <i className="fas fa-save"></i> Save Image
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  TOURNAMENTS TAB
// ════════════════════════════════════════════════════════════════
function TournamentsTab({ tournaments, setTournaments, fetchTournaments, showToast, addNotification }) {
  const [showForm,  setShowForm]  = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form,      setForm]      = useState(emptyTournament);

  const statusClass = { live: "status-live", upcoming: "status-upcoming", completed: "status-completed" };
  const statusLabel = { live: "🔴 LIVE", upcoming: "📅 UPCOMING", completed: "✅ DONE" };

  const openAdd  = () => { setEditingId(null); setForm(emptyTournament); setShowForm(true); };
  const openEdit = (id) => {
    const t = tournaments.find((x) => x._id === id);
    if (!t) return;
    setEditingId(id);
    setForm({ name: t.name || "", game: t.game || "eFootball", status: t.status || "upcoming", date: t.date || "TBD", prizePool: t.prizePool || "TBD", format: t.format || "TBD" });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) { showToast("Tournament name is required.", "danger"); return; }
    const data = { name: form.name.trim(), game: form.game, status: form.status, date: form.date, prizePool: form.prizePool, format: form.format };
    try {
      if (editingId) {
        const res     = await authFetch(`${API}/tournaments/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        const updated = await res.json();
        setTournaments((prev) => prev.map((t) => t._id === editingId ? updated : t));
        showToast("Tournament updated!", "success");
        addNotification(`Tournament "${form.name}" updated.`, "fa-gamepad", "var(--info)");
      } else {
        const res     = await authFetch(`${API}/tournaments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        const created = await res.json();
        setTournaments((prev) => [created, ...prev]);
        showToast("Tournament added!", "success");
        addNotification(`Tournament "${form.name}" (${form.game}) added.`, "fa-gamepad", "var(--info)");
      }
      setShowForm(false);
    } catch (err) {
      console.error(err); showToast("Unable to save.", "danger"); await fetchTournaments();
    }
  };

  const del = async (id) => {
    const t = tournaments.find((x) => x._id === id);
    if (!window.confirm("Delete tournament?")) return;
    try {
      await authFetch(`${API}/tournaments/${id}`, { method: "DELETE" });
      setTournaments((prev) => prev.filter((x) => x._id !== id));
      showToast("Tournament deleted.", "danger");
      addNotification(`Tournament "${t?.name}" deleted.`, "fa-gamepad", "var(--danger)");
    } catch (err) {
      console.error(err); showToast("Unable to delete.", "danger"); await fetchTournaments();
    }
  };

  const f = (key) => ({ value: form[key], onChange: (e) => setForm((prev) => ({ ...prev, [key]: e.target.value })) });

  return (
    <div>
      <div className="panel">
        <div className="panel-head">
          <h3><i className="fas fa-gamepad"></i> Tournament Management</h3>
          <button className="btn-save" style={{ padding: "8px 18px" }} onClick={openAdd}>
            <i className="fas fa-plus"></i> Add Tournament
          </button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead><tr><th>Name</th><th>Game</th><th>Status</th><th>Date</th><th>Prize Pool</th><th>Actions</th></tr></thead>
            <tbody>
              {tournaments.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: "1.5rem", fontFamily: "var(--font-alt)" }}>No tournaments yet.</td></tr>
              )}
              {tournaments.map((t) => (
                <tr key={t._id}>
                  <td style={{ color: "var(--text)", fontWeight: 500 }}>{t.name}</td>
                  <td style={{ color: "var(--text-muted)" }}>{t.game}</td>
                  <td><span className={`tournament-status ${statusClass[t.status]}`}>{statusLabel[t.status]}</span></td>
                  <td style={{ color: "var(--text-muted)" }}>{t.date}</td>
                  <td style={{ color: "var(--gold)" }}>{t.prizePool}</td>
                  <td>
                    <div className="tbl-actions">
                      <button className="tbl-btn edit" onClick={() => openEdit(t._id)} title="Edit"><i className="fas fa-edit"></i></button>
                      <button className="tbl-btn del"  onClick={() => del(t._id)}      title="Delete"><i className="fas fa-trash"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="panel">
          <div className="panel-head">
            <h3>{editingId ? <><i className="fas fa-edit"></i> Edit Tournament</> : <><i className="fas fa-plus"></i> Add Tournament</>}</h3>
            <button className="tbl-btn" onClick={() => setShowForm(false)}><i className="fas fa-times"></i></button>
          </div>
          <div className="panel-body">
            <div className="form-grid">
              <div className="form-group form-full"><label>Tournament Name*</label><input type="text" placeholder="IDC Open Championship 2025" {...f("name")} /></div>
              <div className="form-group"><label>Game</label><input type="text" placeholder="eFootball" {...f("game")} /></div>
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
                  <option value="upcoming">📅 Upcoming</option>
                  <option value="live">🔴 Live</option>
                  <option value="completed">✅ Completed</option>
                </select>
              </div>
              <div className="form-group"><label>Date</label><input type="text" placeholder="DEC 2025" {...f("date")} /></div>
              <div className="form-group"><label>Prize Pool</label><input type="text" placeholder="₹50,000" {...f("prizePool")} /></div>
              <div className="form-group form-full"><label>Format</label><input type="text" placeholder="Battle Royale · Squad · 25 Teams" {...f("format")} /></div>
            </div>
            <div className="form-actions">
              <button className="btn-cancel" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn-save" onClick={save}><i className="fas fa-save"></i> {editingId ? "Update" : "Save"} Tournament</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  CONTACTS TAB
// ════════════════════════════════════════════════════════════════
function ContactsTab({ contacts, setContacts, loading, addNotification, showToast }) {
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const sock = io(API.replace("/api", ""));
    sock.on("new_contact", (msg) => {
      setContacts((prev) => [msg, ...prev]);
      showToast(`📬 New message from ${msg.name}`, "success");
      addNotification(`New contact message from ${msg.name}: "${msg.subject}"`, "fa-envelope", "#ff4422");
      if (Notification.permission === "granted") {
        new Notification(`📬 New IDC Message from ${msg.name}`, { body: msg.subject, icon: "/logo.png" });
      }
    });
    if (Notification.permission === "default") Notification.requestPermission();
    return () => sock.disconnect();
  }, []);

  const updateStatus = async (id, status) => {
    await authFetch(`${API}/contact/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status }),
    });
    setContacts((prev) => prev.map((c) => c._id === id ? { ...c, status } : c));
    if (selected?._id === id) setSelected((s) => ({ ...s, status }));
  };

  const deleteContact = async (id) => {
    if (!window.confirm("Delete this message?")) return;
    await authFetch(`${API}/contact/${id}`, { method: "DELETE" });
    setContacts((prev) => prev.filter((c) => c._id !== id));
    if (selected?._id === id) setSelected(null);
    showToast("Message deleted.", "danger");
    addNotification("Contact message deleted.", "fa-envelope", "var(--danger)");
  };

  const openMessage = (contact) => {
    setSelected(contact);
    if (contact.status === "unread") updateStatus(contact._id, "read");
  };

  const unreadCount = contacts.filter((c) => c.status === "unread").length;

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem", color: "#c8972a", fontFamily: "Orbitron,sans-serif", letterSpacing: "0.2em" }}>
        LOADING MESSAGES...
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1.4fr" : "1fr", gap: "1.5rem" }}>
      <div>
        <div className="panel">
          <div className="panel-head">
            <h3><i className="fas fa-envelope"></i> Contact Messages</h3>
            {unreadCount > 0 && (
              <span style={{ background: "linear-gradient(135deg,#ff1500,#ff5500)", color: "#fff", borderRadius: "50px", padding: "3px 12px", fontSize: "0.72rem", fontFamily: "var(--font-hd)", letterSpacing: "0.1em" }}>
                {unreadCount} UNREAD
              </span>
            )}
          </div>
          <div className="panel-body">
            {contacts.length === 0 && (
              <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "3rem", fontFamily: "var(--font-alt)" }}>No messages yet.</p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {contacts.map((c) => {
                const sc     = STATUS_COLORS[c.status];
                const isOpen = selected?._id === c._id;
                return (
                  <div key={c._id} onClick={() => openMessage(c)}
                    style={{ background: isOpen ? "rgba(200,151,42,0.08)" : "rgba(16,16,32,0.9)", border: `1px solid ${isOpen ? "rgba(200,151,42,0.5)" : "rgba(255,100,0,0.2)"}`, borderRadius: "12px", padding: "1rem 1.2rem", cursor: "pointer", transition: "all 0.25s ease", boxShadow: isOpen ? "0 0 20px rgba(200,151,42,0.15)" : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                          {c.status === "unread" && <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ff4422", flexShrink: 0, boxShadow: "0 0 6px #ff4422" }} />}
                          <strong style={{ fontSize: "0.95rem", color: c.status === "unread" ? "#fff" : "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</strong>
                        </div>
                        <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.subject}</div>
                        <div style={{ fontSize: "0.78rem", color: "#5a6880", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.message}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: "50px", fontSize: "0.58rem", fontFamily: "var(--font-hd)", letterSpacing: "0.1em", background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text, marginBottom: "6px" }}>{c.status.toUpperCase()}</span>
                        <div style={{ fontSize: "0.72rem", color: "#5a6880" }}>{new Date(c.createdAt).toLocaleDateString("en-IN")}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {selected && (
        <div style={{ background: "rgba(16,16,32,0.95)", border: "1px solid rgba(200,151,42,0.35)", borderRadius: "16px", padding: "2rem", position: "sticky", top: "80px", height: "fit-content", boxShadow: "0 0 40px rgba(200,151,42,0.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
            <div>
              <h3 style={{ fontFamily: "var(--font-hd)", fontSize: "1rem", color: "#f0c060", marginBottom: "4px" }}>{selected.name}</h3>
              <a href={`mailto:${selected.email}`} style={{ color: "#ff8c00", fontSize: "0.85rem", textDecoration: "none" }}>{selected.email}</a>
            </div>
            <button onClick={() => setSelected(null)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,100,0,0.3)", borderRadius: "50%", width: "34px", height: "34px", color: "var(--text-muted)", cursor: "pointer", fontSize: "1rem" }}>✕</button>
          </div>
          <div style={{ padding: "10px 14px", background: "rgba(255,100,0,0.07)", borderRadius: "8px", marginBottom: "1.2rem", border: "1px solid rgba(255,100,0,0.2)" }}>
            <span style={{ fontFamily: "var(--font-hd)", fontSize: "0.58rem", color: "#c8972a", letterSpacing: "0.18em" }}>SUBJECT</span>
            <div style={{ marginTop: "4px", fontSize: "0.95rem", color: "var(--text)" }}>{selected.subject}</div>
          </div>
          <div style={{ padding: "14px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", border: "1px solid rgba(255,100,0,0.15)", marginBottom: "1.5rem", minHeight: "120px" }}>
            <span style={{ fontFamily: "var(--font-hd)", fontSize: "0.58rem", color: "#c8972a", letterSpacing: "0.18em" }}>MESSAGE</span>
            <p style={{ marginTop: "8px", lineHeight: "1.75", color: "var(--text-muted)", fontSize: "0.93rem", whiteSpace: "pre-wrap" }}>{selected.message}</p>
          </div>
          <div style={{ fontSize: "0.78rem", color: "#5a6880", marginBottom: "1.5rem" }}>
            Received: {new Date(selected.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
            {["unread", "read", "replied"].map((s) => (
              <button key={s} onClick={() => updateStatus(selected._id, s)}
                style={{ padding: "8px 16px", borderRadius: "8px", fontSize: "0.65rem", fontFamily: "var(--font-hd)", letterSpacing: "0.12em", cursor: "pointer", background: selected.status === s ? STATUS_COLORS[s].bg : "transparent", border: `1px solid ${STATUS_COLORS[s].border}`, color: STATUS_COLORS[s].text, transition: "all 0.2s ease" }}>
                {s.toUpperCase()}
              </button>
            ))}
            <a href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject)}`}
              style={{ padding: "8px 16px", borderRadius: "8px", fontSize: "0.65rem", fontFamily: "var(--font-hd)", letterSpacing: "0.12em", background: "linear-gradient(135deg,#c8972a,#ff7a00)", color: "#fff", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}
              onClick={() => updateStatus(selected._id, "replied")}>
              ✉ REPLY
            </a>
            <button onClick={() => deleteContact(selected._id)}
              style={{ padding: "8px 16px", borderRadius: "8px", fontSize: "0.65rem", fontFamily: "var(--font-hd)", letterSpacing: "0.12em", background: "rgba(255,30,0,0.12)", border: "1px solid rgba(255,30,0,0.4)", color: "#ff4422", cursor: "pointer" }}>
              🗑 DELETE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  NOTIFICATIONS TAB
// ════════════════════════════════════════════════════════════════
function NotificationsTab({ notifications, clearNotifications }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <h3><i className="fas fa-bell"></i> Notifications</h3>
        {notifications.length > 0 && (
          <button className="tbl-btn" onClick={clearNotifications} style={{ fontSize: "0.7rem", padding: "6px 12px" }}>
            <i className="fas fa-trash"></i> Clear All
          </button>
        )}
      </div>
      <div className="panel-body" style={{ padding: notifications.length > 0 ? "0.5rem 1rem" : undefined }}>
        {notifications.length === 0
          ? <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)", fontFamily: "var(--font-alt)" }}>No notifications yet.</div>
          : notifications.map((n, i) => (
              <div key={n.id} style={{ display: "flex", alignItems: "flex-start", gap: "0.9rem", padding: "0.9rem 0", borderBottom: i < notifications.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--bg-raised)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <i className={`fas ${n.icon}`} style={{ color: n.color, fontSize: "0.85rem" }}></i>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--font-alt)", fontSize: "0.85rem", color: "var(--text)", lineHeight: 1.4 }}>{n.msg}</div>
                  <div style={{ fontFamily: "var(--font-hd)", fontSize: "0.6rem", letterSpacing: "0.12em", color: "var(--text-muted)", marginTop: 4 }}>{n.time}</div>
                </div>
                {!n.read && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--gold)", flexShrink: 0, marginTop: 4 }}></div>}
              </div>
            ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  SETTINGS TAB
// ════════════════════════════════════════════════════════════════
function SettingsTab({ showToast, adminName }) {
  return (
    <div className="panel">
      <div className="panel-head"><h3><i className="fas fa-cog"></i> Site Settings</h3></div>
      <div className="panel-body">
        {/* Logged-in user info */}
        <div style={{ padding: "0.9rem 1.1rem", background: "rgba(200,151,42,0.07)", border: "1px solid rgba(200,151,42,0.25)", borderRadius: "10px", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.8rem" }}>
          <i className="fas fa-user-shield" style={{ color: "var(--gold)", fontSize: "1.1rem" }}></i>
          <div>
            <div style={{ fontFamily: "var(--font-hd)", fontSize: "0.6rem", letterSpacing: "0.15em", color: "var(--gold)", marginBottom: "2px" }}>LOGGED IN AS</div>
            <div style={{ fontFamily: "var(--font-alt)", fontSize: "0.92rem", color: "var(--text)" }}>{adminName}</div>
          </div>
        </div>

        <div className="form-grid">
          <div className="form-group"><label>Organization Name</label><input type="text" defaultValue="Immortal De Campeones" /></div>
          <div className="form-group"><label>Short Name</label><input type="text" defaultValue="IDC" /></div>
          <div className="form-group"><label>Contact Email</label><input type="email" defaultValue="contact@immortaldecampeones.gg" /></div>
          <div className="form-group"><label>Discord Invite URL</label><input type="text" defaultValue="https://discord.gg/idc-esports" /></div>
          <div className="form-group"><label>Instagram URL</label><input type="text" defaultValue="https://instagram.com/immortaldecampeones" /></div>
          <div className="form-group"><label>YouTube Channel</label><input type="text" defaultValue="https://youtube.com/@idc-esports" /></div>
          <div className="form-group form-full"><label>Hero Tagline</label><input type="text" defaultValue="We don't just play to compete — we play to conquer." /></div>
          <div className="form-group form-full"><label>About Text</label><textarea style={{ minHeight: 120 }} defaultValue="Immortal De Campeones (IDC) was founded in 2022..."></textarea></div>
        </div>
        <div className="form-actions">
          <button className="btn-save" onClick={() => showToast("Settings saved!", "success")}>
            <i className="fas fa-save"></i> Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  TOAST CONTAINER
// ════════════════════════════════════════════════════════════════
function ToastContainer({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast${t.type ? " " + t.type : ""}`}>{t.msg}</div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  ROOT APP
// ════════════════════════════════════════════════════════════════
export default function App() {
  // ── Restore session from localStorage on first load ──────────
  const savedToken = getToken();
  const [loggedIn,    setLoggedIn]    = useState(!!savedToken);
  const [adminName,   setAdminName]   = useState(savedToken ? decodeUsername(savedToken) : "Admin");
  const [activeTab,   setActiveTab]   = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [players,       setPlayers]       = useState([]);
  const [achievements,  setAchievements]  = useState([]);
  const [tournaments,   setTournaments]   = useState([]);
  const [gallery,       setGallery]       = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [contacts,      setContacts]      = useState([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [unreadCount,   setUnreadCount]   = useState(0);

  const { toasts, showToast } = useToasts();

  const unreadContactCount = contacts.filter((c) => c.status === "unread").length;

  /* ── Notification helpers ── */
  const addNotification = useCallback((msg, icon = "fa-bell", color = "var(--gold)") => {
    const entry = { id: Date.now(), msg, icon, color, read: false, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    setNotifications((prev) => [entry, ...prev]);
    setUnreadCount((c) => c + 1);
  }, []);

  const markAllRead      = useCallback(() => { setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))); setUnreadCount(0); }, []);
  const clearNotifications = useCallback(() => { setNotifications([]); setUnreadCount(0); }, []);

  /* ── Data fetchers (all GET — no token needed) ── */
  const fetchPlayers      = async () => { try { const r = await fetch(`${API}/players`);      if (r.ok) setPlayers(await r.json());      } catch { console.warn("Players fetch failed"); } };
  const fetchAchievements = async () => { try { const r = await fetch(`${API}/achievements`); if (r.ok) setAchievements(await r.json()); } catch { console.warn("Achievements fetch failed"); } };
  const fetchGallery      = async () => { try { const r = await fetch(`${API}/gallery`);      if (r.ok) setGallery(await r.json());      } catch { console.warn("Gallery fetch failed"); } };
  const fetchTournaments  = async () => { try { const r = await fetch(`${API}/tournaments`);  if (r.ok) setTournaments(await r.json());  } catch { console.warn("Tournaments fetch failed"); } };
  const fetchContacts     = async () => {
    try { const r = await fetch(`${API}/contact`); if (r.ok) setContacts(await r.json()); }
    catch { console.warn("Contacts fetch failed"); }
    finally { setContactsLoading(false); }
  };

  useEffect(() => {
    if (loggedIn) {
      fetchPlayers(); fetchAchievements(); fetchGallery(); fetchTournaments(); fetchContacts();
    }
  }, [loggedIn]);

  /* ── Socket.IO: generic notifications ── */
  useEffect(() => {
    socket.on("notification", (data) => {
      showToast(data.message, "success");
      addNotification(data.message, "fa-bell", "var(--info)");
      if (data.type === "player")      fetchPlayers();
      if (data.type === "achievement") fetchAchievements();
      if (data.type === "gallery")     fetchGallery();
      if (data.type === "tournament")  fetchTournaments();
    });
    return () => socket.off("notification");
  }, [addNotification]);

  /* ── Auth handlers ── */
  const handleLogin = (username) => {
    setAdminName(username);
    setLoggedIn(true);
    showToast(`Welcome, ${username}! 🎮`, "success");
  };

  const handleLogout = () => {
    clearToken();
    setLoggedIn(false);
    setActiveTab("dashboard");
    setPlayers([]); setAchievements([]); setGallery([]); setTournaments([]);
    setContacts([]); setNotifications([]); setUnreadCount(0);
  };

  /* ── Auto-logout on 401 from any authFetch ── */
  useEffect(() => {
    const origFetch = window._origFetch || fetch;
    window._origFetch = origFetch;

    // Patch the global fetch to catch 401s from our authFetch calls
    window.addEventListener("unhandledrejection", (e) => {
      if (e?.reason?.status === 401) handleLogout();
    });
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
    if (tab === "notifications") markAllRead();
  };

  if (!loggedIn) return (<><LoginScreen onLogin={handleLogin} /><ToastContainer toasts={toasts} /></>);

  return (
    <>
      <button className="sidebar-toggle" onClick={() => setSidebarOpen((p) => !p)}>
        <i className="fas fa-bars"></i>
      </button>
      <div className="app">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          adminName={adminName}
          onLogout={handleLogout}
          playerCount={players.length}
          sidebarOpen={sidebarOpen}
          unreadCount={unreadCount}
          unreadContactCount={unreadContactCount}
        />
        <div className="main">
          <Topbar
            activeTab={activeTab}
            setActiveTab={handleTabChange}
            unreadCount={unreadCount}
            unreadContactCount={unreadContactCount}
          />
          <div className="content">
            {activeTab === "dashboard"     && <DashboardTab players={players} galleryCount={gallery.length} achievementCount={achievements.length} tournamentCount={tournaments.length} unreadContactCount={unreadContactCount} setActiveTab={handleTabChange} notifications={notifications} />}
            {activeTab === "players"       && <PlayersTab players={players} setPlayers={setPlayers} showToast={showToast} addNotification={addNotification} />}
            {activeTab === "upload"        && <UploadTab showToast={showToast} fetchPlayers={fetchPlayers} addNotification={addNotification} />}
            {activeTab === "achievements"  && <AchievementsTab achievements={achievements} setAchievements={setAchievements} fetchAchievements={fetchAchievements} showToast={showToast} addNotification={addNotification} />}
            {activeTab === "gallery"       && <GalleryTab gallery={gallery} setGallery={setGallery} fetchGallery={fetchGallery} showToast={showToast} addNotification={addNotification} />}
            {activeTab === "tournaments"   && <TournamentsTab tournaments={tournaments} setTournaments={setTournaments} fetchTournaments={fetchTournaments} showToast={showToast} addNotification={addNotification} />}
            {activeTab === "contacts"      && <ContactsTab contacts={contacts} setContacts={setContacts} loading={contactsLoading} addNotification={addNotification} showToast={showToast} />}
            {activeTab === "notifications" && <NotificationsTab notifications={notifications} clearNotifications={clearNotifications} />}
            {activeTab === "settings"      && <SettingsTab showToast={showToast} adminName={adminName} />}
          </div>
        </div>
      </div>
      <ToastContainer toasts={toasts} />
    </>
  );
}