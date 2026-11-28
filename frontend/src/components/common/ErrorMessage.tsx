export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
      {message}
    </div>
  );
}
