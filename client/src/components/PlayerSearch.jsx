import { useState, useRef, useEffect, useMemo } from 'react';

/* ══════════════════════════════════════════════════════════════
  Highlight matched substring inside a label
══════════════════════════════════════════════════════════════ */
function HighlightMatch({ text, query }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
  PLAYER SEARCH — live suggestions dropdown
  Matches against IGN + real name only (substring, case-insensitive).
  Selecting a suggestion scrolls to + highlights that player's card.
══════════════════════════════════════════════════════════════ */
export default function PlayerSearch({ players, searchTerm, onSearchChange, onSelectPlayer }) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const suggestions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return [];
    return players
      .filter(p => (p.ign || '').toLowerCase().includes(q) || (p.name || '').toLowerCase().includes(q))
      .slice(0, 7);
  }, [players, searchTerm]);

  // close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => { setActiveIdx(-1); }, [searchTerm]);

  function pick(player) {
    onSelectPlayer(player);
    setOpen(false);
    inputRef.current?.blur();
  }

  function handleKeyDown(e) {
    if (!open || !suggestions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = suggestions[activeIdx] ?? suggestions[0];
      if (chosen) pick(chosen);
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  return (
    <div className="search-box player-search" ref={wrapRef}>
      <i className="fas fa-search"></i>
      <input
        ref={inputRef}
        type="text"
        id="playerSearch"
        placeholder="Search players..."
        autoComplete="off"
        value={searchTerm}
        onChange={(e) => { onSearchChange(e.target.value); setOpen(true); }}
        onFocus={() => searchTerm && setOpen(true)}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={open && suggestions.length > 0}
        aria-controls="playerSearchSuggestions"
        aria-autocomplete="list"
      />
      {searchTerm && (
        <button
          type="button"
          className="search-clear-btn"
          aria-label="Clear search"
          onClick={() => { onSearchChange(''); setOpen(false); inputRef.current?.focus(); }}
        >
          <i className="fas fa-times clear-box"></i>
        </button>
      )}

      {open && suggestions.length > 0 && (
        <ul className="search-suggestions" id="playerSearchSuggestions" role="listbox">
          {suggestions.map((p, i) => (
            <li
              key={p._id}
              role="option"
              aria-selected={i === activeIdx}
              className={`search-suggestion-item ${i === activeIdx ? 'active' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); pick(p); }}
              onMouseEnter={() => setActiveIdx(i)}
            >
              <div className="suggestion-avatar">
                {p.image
                  ? <img src={p.image} alt="" />
                  : <i className="fas fa-user-ninja"></i>}
              </div>
              <div className="suggestion-text">
                <span className="suggestion-ign">
                  <HighlightMatch text={p.ign || ''} query={searchTerm} />
                </span>
                <span className="suggestion-name">
                  <HighlightMatch text={p.name || ''} query={searchTerm} />
                </span>
              </div>
              {p.role === 'admin' && <span className="suggestion-admin-tag">ADMIN</span>}
            </li>
          ))}
        </ul>
      )}

      {open && searchTerm && suggestions.length === 0 && (
        <ul className="search-suggestions" role="listbox">
          <li className="search-suggestion-empty">No players match "{searchTerm}"</li>
        </ul>
      )}
    </div>
  );
}