
import type { ReactNode } from "react";

type IconProps = {
  name: string;
  size?: number;
};

export function Icon({ name, size = 20 }: IconProps) {
  const paths: Record<string, ReactNode> = {
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="3" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        <path d="M12 14v3" />
      </>
    ),
    eye: (
      <>
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6S2.5 12 2.5 12Z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    eyeOff: (
      <>
        <path d="m3 3 18 18" />
        <path d="M10.6 6.2A10.6 10.6 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-2.1 2.7M6.4 6.4C3.9 8.1 2.5 12 2.5 12s3.5 6 9.5 6a9 9 0 0 0 3-.5" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    send: (
      <>
        <path d="m3 11 18-8-8 18-2-8-8-2Z" />
        <path d="m11 13 10-10" />
      </>
    ),
    arrow: <path d="m15 18-6-6 6-6" />,
    logout: (
      <>
        <path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5" />
        <path d="m16 8 4 4-4 4M9 12h11" />
      </>
    ),
    key: (
      <>
        <circle cx="8" cy="15" r="4" />
        <path d="m11 12 8-8M15 8l3 3M17 6l2 2" />
      </>
    ),
    flower: (
      <>
        <circle cx="12" cy="12" r="2" />
        <circle cx="12" cy="6.5" r="3" />
        <circle cx="17.2" cy="10.3" r="3" />
        <circle cx="15.2" cy="16.4" r="3" />
        <circle cx="8.8" cy="16.4" r="3" />
        <circle cx="6.8" cy="10.3" r="3" />
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? null}
    </svg>
  );
}
