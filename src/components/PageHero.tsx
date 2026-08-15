type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PageHero({ eyebrow, title, description }: PageHeroProps) {
  return (
    <section className="mx-auto max-w-4xl px-4 pb-6 pt-7 text-center sm:pb-8 sm:pt-10 lg:px-6 lg:pt-14">
      <p className="mb-2 inline-flex rounded-full bg-primary-soft px-3 py-1 text-[11px] font-bold tracking-[0.14em] text-primary uppercase sm:mb-3 sm:text-xs">
        {eyebrow}
      </p>
      <h1 className="font-display text-3xl leading-tight text-primary-dark sm:text-4xl lg:text-5xl">
        {title}
      </h1>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:mt-4 sm:text-base lg:text-lg">
        {description}
      </p>
    </section>
  );
}
