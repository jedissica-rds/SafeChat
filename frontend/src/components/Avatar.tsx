
import type { Contact } from "../types/chat";

type AvatarProps = {
  contact: Contact;
};

export function Avatar({ contact }: AvatarProps) {
  return (
    <span
      className={`avatar avatar-${contact.color}`}
      aria-label={contact.name}
      title={contact.name}
    >
      {contact.initials}
    </span>
  );
}
