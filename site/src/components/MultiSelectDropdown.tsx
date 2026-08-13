import { useEffect, useRef, useState } from "react";

interface MultiSelectDropdownProps {
  label: string;
  allLabel: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function MultiSelectDropdown({ label, allLabel, options, selected, onChange }: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleOption(option: string) {
    if (selected.includes(option)) {
      onChange(selected.filter((o) => o !== option));
    } else {
      onChange([...selected, option]);
    }
  }

  const summary =
    selected.length === 0 ? allLabel : selected.length === 1 ? selected[0] : `${selected.length} selected`;

  return (
    <div className="multiselect" ref={rootRef}>
      <span className="multiselect__label">{label}</span>
      <button className="multiselect__trigger mono" onClick={() => setOpen((o) => !o)} data-open={open}>
        {summary}
        <span className="multiselect__arrow">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="multiselect__panel">
          <button
            className="multiselect__option multiselect__option--clear"
            onClick={() => onChange([])}
            disabled={selected.length === 0}
          >
            Clear ({allLabel})
          </button>
          {options.map((option) => (
            <label key={option} className="multiselect__option">
              <input type="checkbox" checked={selected.includes(option)} onChange={() => toggleOption(option)} />
              {option}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
