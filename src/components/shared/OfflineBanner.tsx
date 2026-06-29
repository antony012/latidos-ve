export function OfflineBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="bg-amber-50 px-4 py-2 text-center text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100"
    >
      {message}
    </div>
  );
}
