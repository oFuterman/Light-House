interface StatusBadgeProps {
  status: number | null;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  if (status === null) {
    return (
      <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-600">
        Pending
      </span>
    );
  }

  const isSuccess = status >= 200 && status < 300;

  return (
    <span
      className={`px-2 py-1 text-xs font-medium rounded ${
        isSuccess
          ? "bg-green-100 text-green-700"
          : "bg-red-100 text-red-700"
      }`}
    >
      {isSuccess ? "UP" : "DOWN"} ({status})
    </span>
  );
}
