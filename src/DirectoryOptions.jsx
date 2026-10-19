import { useEffect, useState } from 'react';

export default function DirectoryOptions({ country, sort, onCountryChange, onSortChange, onReset, filtered, children }) {
  const [value, setValue] = useState(country);
  useEffect(() => { setValue(country); }, [country]);
  useEffect(() => {
    const timer = setTimeout(() => onCountryChange(value.trim()), 300);
    return () => clearTimeout(timer);
  }, [value, onCountryChange]);

  return <>
    <input className="filter-field" aria-label="Filter profiles by country" placeholder="Country" maxLength={100} value={value} onChange={event => setValue(event.target.value)}/>
    {children}
    <select className="filter-field" aria-label="Sort profiles" value={sort} onChange={event => onSortChange(event.target.value)}>
      <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
      <option value="name-asc">Name: A to Z</option><option value="name-desc">Name: Z to A</option>
    </select>
    {filtered && <button className="text-button" onClick={onReset}>Reset filters</button>}
  </>;
}
