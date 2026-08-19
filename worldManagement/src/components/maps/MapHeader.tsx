import React from "react";
import { BookOpen, Pencil, Trash2 } from "lucide-react";
import { MapMeta } from "../../types/map";
import { useLocalization } from "../../context/LocalizationContext";
import { ViewHeader } from "../common/ViewHeader";
import { Button } from "../common/Button";

interface MapHeaderProps {
  map: MapMeta;
  totalMapsCount: number;
  hasHistory: boolean;
  onBack: () => void;
  onDelete: () => void;
  onOpenArticle?: (articleId: string) => void;
  onEdit?: () => void;
  /** Controlli aggiuntivi da affiancare alle azioni (qui: PortalControls). */
  children?: React.ReactNode;
}

export const MapHeader: React.FC<MapHeaderProps> = ({
  map,
  totalMapsCount,
  hasHistory,
  onBack,
  onDelete,
  onOpenArticle,
  onEdit,
  children,
}) => {
  const { t } = useLocalization();

  const actions = (
    <>
      {map.article_id && onOpenArticle && (
        <Button
          variant="secondary"
          size="sm"
          icon={BookOpen}
          onClick={() => onOpenArticle(map.article_id!)}
          title={t("maps.header.openLinkedArticle")}
        >
          <span className="hide-on-small">{t("common.lore")}</span>
        </Button>
      )}

      <Button variant="secondary" size="sm" icon={Pencil} onClick={onEdit} title={t("maps.header.changeMap")}>
        <span className="hide-on-small">{t("common.edit")}</span>
      </Button>

      {/* Mostra il pulsante Elimina solo se ci sono più mappe attive nel sistema */}
      {totalMapsCount > 1 && (
        <Button
          variant="danger"
          iconOnly
          size="sm"
          icon={Trash2}
          onClick={onDelete}
          title={t("maps.header.deleteMap")}
        />
      )}

      {children}
    </>
  );

  return (
    <ViewHeader
      title={map.title}
      badge={t("maps.map")}
      onBack={hasHistory ? onBack : undefined}
      backLabel={t("common.back")}
      actions={actions}
    />
  );
};
