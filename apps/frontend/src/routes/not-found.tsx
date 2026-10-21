import { Link } from "react-router";

export default function NotFound() {
  return (
    <div className="w-full p-4">
      <p className="text-sm font-light">Page not found</p>
      <Link to="/" className="text-sm underline">
        Back to home
      </Link>
    </div>
  );
}
