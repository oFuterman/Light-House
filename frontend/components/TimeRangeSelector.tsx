interface TimeRangeOption {
  label: string;
  value: number;
}

const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { label: "Last hour", value: 1 },
  { label: "Last 24 hours", value: 24 },
  { label: "Last 7 days", value: 168 },
];

interface TimeRangeSelectorProps {
  value: number;
  onChange: (hours: number) => void;
  disabled?: boolean;
}

export function TimeRangeSelector({
  value,
  onChange,
  disabled,
}: TimeRangeSelectorProps) {
  return (
    <div className="inline-flex rounded-md shadow-sm" role="group">
      {TIME_RANGE_OPTIONS.map((option, index) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          disabled={disabled}
          className={`
            px-4 py-2 text-sm font-medium border
            ${index === 0 ? "rounded-l-md" : ""}
            ${index === TIME_RANGE_OPTIONS.length - 1 ? "rounded-r-md" : ""}
            ${index !== 0 ? "-ml-px" : ""}
            focus:z-10 focus:ring-2 focus:ring-blue-500 focus:outline-none
            disabled:opacity-50 disabled:cursor-not-allowed
            ${
              value === option.value
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }
          `}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
