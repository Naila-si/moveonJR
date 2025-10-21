export function Card({ className = "", ...props }) {
  return <div className={"rounded-2xl border shadow-sm " + className} {...props} />;
}
export function CardContent({ className = "", ...props }) {
  return <div className={"p-4 " + className} {...props} />;
}
