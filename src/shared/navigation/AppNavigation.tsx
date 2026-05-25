import { NavLink } from "react-router";

const links = [
  { label: "Docs", to: "/" },
  { label: "Demo", to: "/demo" },
  { label: "Editor", to: "/editor" },
];

export function AppNavigation() {
  return (
    <nav className="app-navigation" aria-label="Primary navigation">
      <span className="brand">Maps Editor</span>
      <div className="nav-links">
        {links.map((link) => (
          <NavLink
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            end={link.to === "/"}
            key={link.to}
            to={link.to}
          >
            {link.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
