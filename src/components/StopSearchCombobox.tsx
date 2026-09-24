'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';

interface StopSearchComboboxProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (stop: string) => void;
  allStops: string[];
  localizeStop?: (stop: string) => string;
  disabled?: boolean;
  error?: string | null;
  icon?: string;
  noResultsText?: string;
  clearLabel?: string;
}

export const StopSearchCombobox: React.FC<StopSearchComboboxProps> = ({
  id,
  label,
  placeholder,
  value,
  onChange,
  allStops,
  localizeStop,
  disabled = false,
  error = null,
  icon = '🔍',
  noResultsText = 'No matching stops found',
  clearLabel = 'Clear stop'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  // Sync internal display text when value prop changes (e.g. via voice or quick hub)
  useEffect(() => {
    if (value) {
      const display = localizeStop ? localizeStop(value) : value;
      setInputValue(display);
    } else {
      setInputValue('');
    }
  }, [value, localizeStop]);

  // Handle outside clicks to close the dropdown
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // Reset display text to current selected value if user typed without selecting
        if (value) {
          const display = localizeStop ? localizeStop(value) : value;
          setInputValue(display);
        } else {
          setInputValue('');
        }
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [value, localizeStop]);

  // Filter stops dynamically and cap visible results for high performance
  const filteredStops = useMemo(() => {
    if (!allStops || allStops.length === 0) return [];
    const query = inputValue.trim().toLowerCase();

    // If query matches the currently selected stop's display or canonical name, or is empty, show default stops
    const isExactSelected = value && (
      query === value.toLowerCase() ||
      (localizeStop && query === localizeStop(value).toLowerCase())
    );

    if (!query || isExactSelected) {
      // Show first 40 stops alphabetically
      return allStops.slice(0, 40);
    }

    const startsWith: string[] = [];
    const contains: string[] = [];

    for (const stop of allStops) {
      const canonicalLower = stop.toLowerCase();
      const localizedLower = localizeStop ? localizeStop(stop).toLowerCase() : '';

      if (canonicalLower.startsWith(query) || localizedLower.startsWith(query)) {
        startsWith.push(stop);
      } else if (canonicalLower.includes(query) || localizedLower.includes(query)) {
        contains.push(stop);
      }

      if (startsWith.length + contains.length >= 40) {
        break;
      }
    }

    return [...startsWith, ...contains];
  }, [allStops, inputValue, value, localizeStop]);

  // Ensure highlighted index is visible when scrolling with keys
  useEffect(() => {
    if (highlightedIndex >= 0 && listboxRef.current) {
      const optionElement = listboxRef.current.children[highlightedIndex] as HTMLElement;
      if (optionElement) {
        optionElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  const handleSelect = (canonicalStop: string) => {
    onChange(canonicalStop);
    const display = localizeStop ? localizeStop(canonicalStop) : canonicalStop;
    setInputValue(display);
    setIsOpen(false);
    setHighlightedIndex(-1);
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setInputValue('');
    setIsOpen(true);
    setHighlightedIndex(-1);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
        return;
      }
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (filteredStops.length > 0) {
          setHighlightedIndex(prev => (prev < filteredStops.length - 1 ? prev + 1 : 0));
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (filteredStops.length > 0) {
          setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredStops.length - 1));
        }
        break;

      case 'Enter':
        e.preventDefault();
        if (isOpen) {
          if (highlightedIndex >= 0 && highlightedIndex < filteredStops.length) {
            handleSelect(filteredStops[highlightedIndex]);
          } else if (filteredStops.length > 0) {
            // Select the first matching stop
            handleSelect(filteredStops[0]);
          }
        }
        break;

      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        if (value) {
          const display = localizeStop ? localizeStop(value) : value;
          setInputValue(display);
        }
        break;

      case 'Tab':
        setIsOpen(false);
        break;

      default:
        break;
    }
  };

  return (
    <div className="input-group combobox-group" ref={containerRef}>
      <label htmlFor={id} className="input-label">
        {label}
      </label>

      <div className={`combobox-wrapper ${isOpen ? 'open' : ''} ${error ? 'has-error' : ''}`}>
        <span className="combobox-prefix-icon" aria-hidden="true">
          {icon}
        </span>

        <input
          ref={inputRef}
          id={id}
          type="text"
          className="input-field combobox-input"
          placeholder={placeholder}
          value={inputValue}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={`${id}-listbox`}
          aria-activedescendant={
            highlightedIndex >= 0 ? `${id}-option-${highlightedIndex}` : undefined
          }
          onClick={() => {
            if (!disabled) setIsOpen(true);
          }}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          onChange={e => {
            setInputValue(e.target.value);
            if (!isOpen) setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onKeyDown={handleKeyDown}
        />

        <div className="combobox-actions">
          {inputValue && !disabled && (
            <button
              type="button"
              className="combobox-clear-btn"
              onClick={handleClear}
              aria-label={clearLabel}
              title={clearLabel}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}

          <button
            type="button"
            className={`combobox-toggle-btn ${isOpen ? 'active' : ''}`}
            onClick={() => {
              if (!disabled) {
                setIsOpen(!isOpen);
                if (!isOpen && inputRef.current) {
                  inputRef.current.focus();
                }
              }
            }}
            tabIndex={-1}
            aria-label="Toggle stops dropdown"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>

        {isOpen && (
          <ul
            id={`${id}-listbox`}
            ref={listboxRef}
            className="combobox-dropdown"
            role="listbox"
            aria-label={`${label} options`}
          >
            {filteredStops.length > 0 ? (
              filteredStops.map((stop, index) => {
                const localized = localizeStop ? localizeStop(stop) : stop;
                const isSelected = Boolean(value && stop.toLowerCase() === value.toLowerCase());
                const isHighlighted = highlightedIndex === index;

                return (
                  <li
                    key={stop}
                    id={`${id}-option-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    className={`combobox-option ${isHighlighted ? 'highlighted' : ''} ${isSelected ? 'selected' : ''}`}
                    onPointerEnter={() => setHighlightedIndex(index)}
                    onClick={() => handleSelect(stop)}
                  >
                    <div className="option-name-wrap">
                      <span className="option-name">{localized}</span>
                      {localized !== stop && (
                        <span className="option-sub-name">{stop}</span>
                      )}
                    </div>
                    {isSelected && (
                      <span className="option-check" aria-hidden="true">
                        ✓
                      </span>
                    )}
                  </li>
                );
              })
            ) : (
              <li className="combobox-empty" role="status">
                {noResultsText}
              </li>
            )}
          </ul>
        )}
      </div>

      {error && <div className="combobox-error-text">{error}</div>}
    </div>
  );
};
