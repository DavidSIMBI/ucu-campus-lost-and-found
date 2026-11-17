export default function SearchBar({ value, onChange }) {
  return (
    <label className="search-box">
      <span className="search-icon" aria-hidden="true">⌕</span>
      <span className="visually-hidden">Search items</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Try “water bottle” or “library”" />
    </label>
  );
}
