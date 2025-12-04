"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";

// Preset time range options (in minutes)
const TIME_PRESETS = [
  { label: "Past 5 minutes", value: 5 },
  { label: "Past 10 minutes", value: 10 },
  { label: "Past 15 minutes", value: 15 },
  { label: "Past 30 minutes", value: 30 },
  { label: "Past 1 hour", value: 60 },
  { label: "Past 24 hours", value: 1440 },
  { label: "Past 7 days", value: 10080 },
];

export interface TimeRange {
  from: Date;
  to: Date;
}

interface TimeRangePickerProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  disabled?: boolean;
}

// Format date for display in the input: "12/03 14:30:00"
function formatDisplayDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${month}/${day} ${hours}:${minutes}:${seconds}`;
}

// Format the full range for input: "12/03 14:30:00 - 12/03 14:45:00"
function formatRangeForInput(range: TimeRange): string {
  return `${formatDisplayDate(range.from)} - ${formatDisplayDate(range.to)}`;
}

// Parse a date string like "12/03 14:30:00" - be lenient with spaces
function parseDisplayDate(str: string, referenceYear: number): Date | null {
  const cleaned = str.trim();

  // Match: "12/03 14:30:00" or "12/3 14:30:00" - allow multiple spaces
  const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!match) return null;

  const [, monthStr, dayStr, hours, minutes, seconds] = match;

  const month = parseInt(monthStr) - 1; // Convert to 0-indexed
  if (month < 0 || month > 11) return null;

  const day = parseInt(dayStr);
  if (day < 1 || day > 31) return null;

  const date = new Date(
    referenceYear,
    month,
    day,
    parseInt(hours),
    parseInt(minutes),
    parseInt(seconds)
  );

  return isNaN(date.getTime()) ? null : date;
}

// Parse the full input string: "12/03 14:30:00 - 12/03 14:45:00"
// Be lenient with the separator - allow " - ", "-", " -", "- "
function parseRangeInput(input: string): TimeRange | null {
  // Try splitting on various separator formats
  let parts: string[] = [];

  if (input.includes(" - ")) {
    parts = input.split(" - ");
  } else if (input.includes(" -")) {
    parts = input.split(" -");
  } else if (input.includes("- ")) {
    parts = input.split("- ");
  } else if (input.includes("-")) {
    // Find a dash that's likely a separator (not part of a number)
    // Look for pattern like "00 -" or "00-"
    const separatorMatch = input.match(/(\d{2})\s*-\s*(\d{2}\/)/);
    if (separatorMatch) {
      const sepIndex = input.indexOf(separatorMatch[0]);
      const dashOffset = separatorMatch[0].indexOf("-");
      parts = [
        input.slice(0, sepIndex + dashOffset).trim(),
        input.slice(sepIndex + dashOffset + 1).trim()
      ];
    }
  }

  if (parts.length !== 2) return null;

  const currentYear = new Date().getFullYear();
  const from = parseDisplayDate(parts[0].trim(), currentYear);
  const to = parseDisplayDate(parts[1].trim(), currentYear);

  if (!from || !to) return null;
  if (from >= to) return null;

  return { from, to };
}

export function TimeRangePicker({ value, onChange, disabled }: TimeRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if the current input is valid
  const isInputValid = useMemo(() => {
    if (!inputValue.trim()) return true; // Empty is ok (will use current value)
    return parseRangeInput(inputValue) !== null;
  }, [inputValue]);

  // Determine if current range matches a preset
  // Only match if both:
  // 1. The "to" time is within 2 minutes of now
  // 2. The duration exactly matches a preset (within 1 minute tolerance)
  const matchingPreset = useMemo(() => {
    const diffMs = value.to.getTime() - value.from.getTime();
    const diffMinutes = Math.round(diffMs / (1000 * 60));

    // Check if "to" is close to now (within 2 minutes)
    const now = new Date();
    const toIsNow = Math.abs(now.getTime() - value.to.getTime()) < 2 * 60 * 1000;

    if (!toIsNow) return null;

    // Use 1 minute tolerance for matching
    return TIME_PRESETS.find(p => Math.abs(p.value - diffMinutes) <= 1) || null;
  }, [value]);

  // When focusing, populate the input with the current range
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    setIsOpen(true);
    setInputValue(formatRangeForInput(value));
    // Select all text for easy replacement
    setTimeout(() => inputRef.current?.select(), 0);
  }, [value]);

  // Apply manual input changes
  const applyInputChanges = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return false;

    const parsed = parseRangeInput(trimmed);
    if (parsed) {
      onChange(parsed);
      return true;
    }
    return false;
  }, [inputValue, onChange]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (isFocused && inputValue.trim()) {
          applyInputChanges();
        }
        setIsOpen(false);
        setIsFocused(false);
        setInputValue("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isFocused, inputValue, applyInputChanges]);

  const handlePresetClick = useCallback((preset: typeof TIME_PRESETS[0]) => {
    const now = new Date();
    const from = new Date(now.getTime() - preset.value * 60 * 1000);
    onChange({ from, to: now });
    setIsOpen(false);
    setIsFocused(false);
    setInputValue("");
    inputRef.current?.blur();
  }, [onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // If we have valid input, apply it
      if (inputValue.trim() && isInputValid) {
        applyInputChanges();
        setIsOpen(false);
        setIsFocused(false);
        setInputValue("");
        inputRef.current?.blur();
      } else if (highlightedIndex >= 0 && highlightedIndex < TIME_PRESETS.length) {
        handlePresetClick(TIME_PRESETS[highlightedIndex]);
      }
    }
    if (e.key === "Escape") {
      setIsOpen(false);
      setIsFocused(false);
      setInputValue("");
      inputRef.current?.blur();
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < TIME_PRESETS.length - 1 ? prev + 1 : 0));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : TIME_PRESETS.length - 1));
    }
  };

  // Reset highlighted index when dropdown opens
  useEffect(() => {
    if (isOpen) {
      // Highlight the matching preset if there is one
      const matchIdx = TIME_PRESETS.findIndex(p => p.value === matchingPreset?.value);
      setHighlightedIndex(matchIdx >= 0 ? matchIdx : 2); // Default to 15 minutes (index 2)
    }
  }, [isOpen, matchingPreset]);

  // Placeholder text when not focused - show range if no matching preset
  const placeholder = matchingPreset ? matchingPreset.label : formatRangeForInput(value);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input */}
      <div
        className={`
          flex items-center border rounded-md transition-all bg-white
          ${isOpen
            ? isInputValid
              ? "border-blue-500 ring-2 ring-blue-500"
              : "border-red-500 ring-2 ring-red-500"
            : "border-gray-300"
          }
          ${disabled ? "opacity-50 cursor-not-allowed bg-gray-50" : "hover:border-gray-400"}
        `}
      >
        {/* Clock icon */}
        <div className="pl-3 text-gray-400 flex-shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={isFocused ? inputValue : ""}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 px-3 py-2 text-sm bg-transparent focus:outline-none disabled:cursor-not-allowed placeholder:text-gray-700 min-w-0"
        />

        {/* Dropdown chevron */}
        <button
          type="button"
          onClick={() => {
            if (!disabled) {
              if (isOpen) {
                if (inputValue.trim() && isInputValid) {
                  applyInputChanges();
                }
                setIsOpen(false);
                setIsFocused(false);
                setInputValue("");
              } else {
                inputRef.current?.focus();
              }
            }
          }}
          disabled={disabled}
          className="pr-3 text-gray-400 flex-shrink-0 hover:text-gray-600"
        >
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-30 mt-1 bg-white border border-gray-200 rounded-md shadow-lg w-full min-w-[200px]">
          {/* Invalid input warning */}
          {!isInputValid && (
            <div className="px-3 py-2 text-xs text-red-600 bg-red-50 border-b border-red-100">
              Invalid format. Use: MM/DD HH:MM:SS - MM/DD HH:MM:SS
            </div>
          )}

          <div className="py-1">
            {TIME_PRESETS.map((preset, index) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => handlePresetClick(preset)}
                className={`
                  w-full px-4 py-2 text-sm text-left flex items-center justify-between
                  ${index === highlightedIndex
                    ? "bg-blue-50 text-blue-700"
                    : matchingPreset?.value === preset.value
                      ? "bg-gray-50 text-gray-900"
                      : "text-gray-700 hover:bg-gray-50"
                  }
                `}
              >
                <span>{preset.label}</span>
                {matchingPreset?.value === preset.value && (
                  <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
          <div className="px-3 py-2 border-t border-gray-100 text-xs text-gray-500">
            Type to edit or select a preset
          </div>
        </div>
      )}
    </div>
  );
}
