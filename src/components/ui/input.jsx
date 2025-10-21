export function Input({ className = "", ...props }) {
  return (
    <input
      className={"h-9 w-full rounded-md border px-3 py-1 outline-none focus:ring " + className}
      {...props}
    />
  );
}
