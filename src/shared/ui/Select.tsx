import React, { useState, useRef, useEffect, useId } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

export interface SelectProps<T extends string = string> {
  label?: string;
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function Select<T extends string = string>({
  label,
  options,
  value,
  onChange,
  placeholder = "Válassz...",
  hint,
  error,
  disabled = false,
  className = ""
}: SelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const selectedOption = options.find((opt) => opt.value === value);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative space-y-1.5 ${className}`}>
      {label && (
        <label
          id={`${id}-label`}
          className="block text-12 font-medium uppercase tracking-wider text-text-secondary"
        >
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={label ? `${id}-label ${id}` : id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`w-full h-10 px-3.5 rounded-12 border bg-bg-surface text-14 text-left flex items-center justify-between transition-all duration-200 ease-apex-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-40 disabled:cursor-not-allowed ${
          error
            ? "border-status-rest"
            : isOpen
            ? "border-brand ring-2 ring-brand/20"
            : "border-border-hairline hover:border-border-subtle"
        }`}
      >
        <span className="flex items-center gap-2 truncate text-text-primary">
          {selectedOption?.icon && <span>{selectedOption.icon}</span>}
          <span>{selectedOption ? selectedOption.label : placeholder}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 text-text-secondary transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <ul
          role="listbox"
          tabIndex={-1}
          aria-labelledby={`${id}-label`}
          className="absolute z-50 mt-1 w-full rounded-12 border border-border-hairline bg-bg-elevated p-1 shadow-elevated max-h-60 overflow-y-auto focus:outline-none"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between px-3 py-2 text-14 rounded-12 cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-brand/10 text-brand font-semibold"
                    : "text-text-primary hover:bg-bg-surface"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {opt.icon && <span>{opt.icon}</span>}
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
              </li>
            );
          })}
        </ul>
      )}

      {error ? (
        <p className="text-12 text-status-rest">{error}</p>
      ) : hint ? (
        <p className="text-12 text-text-secondary">{hint}</p>
      ) : null}
    </div>
  );
}
