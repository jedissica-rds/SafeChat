
import { Icon } from "./Icon";

type BrandProps = {
  compact?: boolean;
};

export function Brand({ compact = false }: BrandProps) {
  return (
    <div
      className={`brand ${compact ? "brand-compact" : ""}`}
    >
      <span className="brand-mark">
        <Icon name="lock" size={compact ? 19 : 24} />
      </span>

      <div>
        <strong>Chat Seguro</strong>

        {!compact && (
          <span>Suas mensagens, só entre vocês</span>
        )}
      </div>
    </div>
  );
}
