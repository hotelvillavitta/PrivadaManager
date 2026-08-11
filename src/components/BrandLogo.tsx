import Image from "next/image";

type BrandLogoProps = {
  variant?: "mark" | "full";
  className?: string;
  priority?: boolean;
};

/** Logotipo Privada Manager: marca (casa/escudo) o logo completo. */
export function BrandLogo({
  variant = "mark",
  className = "",
  priority = false,
}: BrandLogoProps) {
  if (variant === "full") {
    return (
      <Image
        src="/brand/logo-full.png"
        alt="Privada Manager — Tu privada, siempre en orden"
        width={1024}
        height={682}
        className={className}
        priority={priority}
      />
    );
  }

  return (
    <Image
      src="/icons/icon-192.png"
      alt="Privada Manager"
      width={192}
      height={192}
      className={className}
      priority={priority}
    />
  );
}
