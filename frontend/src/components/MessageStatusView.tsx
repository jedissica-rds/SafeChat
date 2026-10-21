
import type { MessageStatus } from "../types/chat";

type MessageStatusViewProps = {
  status?: MessageStatus;
};

export function MessageStatusView({
  status,
}: MessageStatusViewProps) {
  switch (status) {
    case "sent":
      return (
        <span className="message-status" title="Enviada">
          ✓
        </span>
      );

    case "delivered":
      return (
        <span className="message-status" title="Entregue">
          ✓✓
        </span>
      );

    case "read":
      return (
        <span
          className="message-status read"
          title="Lida"
        >
          ✓✓
        </span>
      );

    case "failed":
      return (
        <span
          className="message-status failed"
          title="Sem confirmação do servidor"
        >
          !
        </span>
      );

    default:
      return null;
  }
}
