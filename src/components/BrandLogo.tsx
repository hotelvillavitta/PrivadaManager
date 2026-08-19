import Image from "next/image";

type BrandLogoProps = {
  variant?: "mark" | "full";
  className?: string;
  priority?: boolean;
};

const SRC = "/brand/grenache-logo.png";

/** Logotipo oficial Grenache — Fraccionamiento Viñas del Mar. */
export function BrandLogo({
  variant = "mark",
  className = "",
  priority = false,
}: BrandLogoProps) {
  if (variant === "full") {
    return (
      <Image
        src={SRC}
        alt="Grenache — Fraccionamiento Viñas del Mar"
        width={500}
        height={500}
        className={className}
        priority={priority}
      />
    );
  }

  return (
    <Image
      src={SRC}
      alt="Grenache"
      width={192}
      height={192}
      className={className}
      priority={priority}
    />
  );
}
