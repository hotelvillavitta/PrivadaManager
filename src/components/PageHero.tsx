type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PageHero({ eyebrow, title, description }: PageHeroProps) {
  return (
    <section className="mx-auto max-w-4xl px-4 pb-8 pt-12 text-center lg:px-6 lg:pt-16">
      <p className="mb-3 inline-flex rounded-full bg-primary-soft px-3 py-1 text-xs font-bold tracking-[0.16em] text-primary uppercase">
        {eyebrow}
      </p>
      <h1 className="font-display text-4xl text-primary-dark sm:text-5xl">
        {title}
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
        {description}
      </p>
    </section>
  );
}
