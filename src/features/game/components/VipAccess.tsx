import React from "react";

import { SUNNYSIDE } from "assets/sunnyside";
import { Label } from "components/ui/Label";
import { getSeasonalTicket } from "features/game/types/seasons";
import { ITEM_DETAILS } from "../types/images";
import { useAppTranslation } from "lib/i18n/useAppTranslations";

import lock from "assets/skills/lock.png";
import { hasFeatureAccess } from "lib/flags";
import { TEST_FARM } from "../lib/constants";

interface VIPAccessProps {
  isVIP: boolean;
  onUpgrade: () => void;
}

export const VIPAccess: React.FC<VIPAccessProps> = ({ onUpgrade, isVIP }) => {
  const { t } = useAppTranslation();

  if (!isVIP && !hasFeatureAccess(TEST_FARM, "BANNER_SALES")) {
    return (
      <Label
        type="warning"
        icon={lock}
        secondaryIcon={ITEM_DETAILS[getSeasonalTicket()].image}
      >
        {/** This string will disappear May 1st */}
        {`VIP Access available May 1st`}
      </Label>
    );
  }

  return isVIP ? (
    <Label type="success" icon={SUNNYSIDE.icons.confirm}>
      {t("vipAccess")}
    </Label>
  ) : (
    <Label
      type="warning"
      icon={lock}
      secondaryIcon={ITEM_DETAILS[getSeasonalTicket()].image}
      onClick={onUpgrade}
    >
      {t("goblinTrade.vipRequired")}
    </Label>
  );
};
