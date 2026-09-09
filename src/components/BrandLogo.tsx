import Image from "next/image";

type BrandLogoProps = {
  variant?: "mark" | "full";
  className?: string;
  priority?: boolean;
  src?: string | null;
  alt?: string;
};

const DEFAULT_SRC = "/brand/grenache-logo.png";

/** Logotipo de la privada (personalizable). */
export function BrandLogo({
  variant = "mark",
  className = "",
  priority = false,
  src,
  alt = "Logo",
}: BrandLogoProps) {
  const imageSrc = src || DEFAULT_SRC;
  const isRemote = /^https?:\/\//i.test(imageSrc);

  if (isRemote) {
    // URLs de Blob / externas: usar img nativo para no reconfigurar remotePatterns.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageSrc}
        alt={alt}
        className={className}
        width={variant === "full" ? 500 : 192}
        height={variant === "full" ? 500 : 192}
      />
    );
  }

  if (variant === "full") {
    return (
      <Image
        src={imageSrc}
        alt={alt}
        width={500}
        height={500}
        className={className}
        priority={priority}
      />
    );
  }

  return (
    <Image
      src={imageSrc}
      alt={alt}
      width={192}
      height={192}
      className={className}
      priority={priority}
    />
  );
}
