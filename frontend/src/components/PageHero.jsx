export default function PageHero({ title, subtitle, children }) {
  return (
    <section className="app-hero">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="app-hero__side">{children}</div>}
    </section>
  );
}