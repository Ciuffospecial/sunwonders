import { useActor } from "@xstate/react";
import { SUNNYSIDE } from "assets/sunnyside";
import classNames from "classnames";
import { Box } from "components/ui/Box";
import { Button } from "components/ui/Button";
import { Context } from "features/game/GameProvider";
import { getKeys } from "features/game/types/craftables";
import {
  Inventory,
  InventoryItemName,
  TradeListing,
} from "features/game/types/game";
import { ITEM_DETAILS } from "features/game/types/images";
import React, { ChangeEvent, useContext, useState } from "react";
import token from "assets/icons/sfl.webp";
import lock from "assets/skills/lock.png";
import tradeIcon from "assets/icons/trade.png";
import Decimal from "decimal.js-light";
import { OuterPanel } from "components/ui/Panel";
import { getBumpkinLevel } from "features/game/lib/level";
import { useAppTranslation } from "lib/i18n/useAppTranslations";
import { makeListingType } from "lib/utils/makeTradeListingType";
import { Label } from "components/ui/Label";
import { TRADE_LIMITS } from "features/world/ui/trader/BuyPanel";
import { FloorPrices } from "features/game/actions/getListingsFloorPrices";
import { setPrecision } from "lib/utils/formatNumber";
import { hasVipAccess } from "features/game/lib/vipAccess";
import { ModalContext } from "features/game/components/modal/ModalProvider";
import { VIPAccess } from "features/game/components/VipAccess";

const VALID_INTEGER = new RegExp(/^\d+$/);
const VALID_FOUR_DECIMAL_NUMBER = new RegExp(/^\d*(\.\d{0,4})?$/);
const INPUT_MAX_CHAR = 10;

const MAX_SFL = 150;

type Items = Partial<Record<InventoryItemName, number>>;
const ListTrade: React.FC<{
  inventory: Inventory;
  onList: (items: Items, sfl: number) => void;
  onCancel: () => void;
  isSaving: boolean;
  floorPrices: FloorPrices;
}> = ({ inventory, onList, onCancel, isSaving, floorPrices }) => {
  const { t } = useAppTranslation();
  const [selected, setSelected] = useState<InventoryItemName>();
  const [quantityDisplay, setQuantityDisplay] = useState("");
  const [sflDisplay, setSflDisplay] = useState("");

  const quantity = Number(quantityDisplay);
  const sfl = Number(sflDisplay);

  const maxSFL = sfl > MAX_SFL;

  if (!selected) {
    return (
      <div>
        <div className="flex items-center justify-between m-1 ml-2 mb-3">
          <Label icon={SUNNYSIDE.icons.basket} type="default">
            {t("bumpkinTrade.like.list")}
          </Label>
          <Label icon={SUNNYSIDE.icons.confirm} type="success">
            {t("vipAccess")}
          </Label>
        </div>

        <div className="flex flex-wrap ">
          {getKeys(TRADE_LIMITS)
            .filter((name) => !!inventory[name]?.gte(1))

            .map((name) => (
              <div
                key={name}
                className="w-1/3 sm:w-1/4 md:w-1/5 lg:w-1/6 pr-1 pb-1 mb-2"
              >
                <OuterPanel
                  className="w-full relative flex flex-col items-center justify-center cursor-pointer hover:bg-brown-200"
                  onClick={() => {
                    setSelected(name);
                  }}
                >
                  <Label type="default" className="absolute -top-3 -right-2">
                    {`${setPrecision(new Decimal(inventory?.[name] ?? 0), 0)}`}
                  </Label>
                  <span className="text-xs mb-1">{name}</span>
                  <img src={ITEM_DETAILS[name].image} className="h-10 mb-6" />
                  <Label
                    type="warning"
                    className="absolute -bottom-2 text-center mt-1 p-1"
                    style={{ width: "calc(100% + 10px)" }}
                  >
                    {t("bumpkinTrade.price/unit", {
                      price: floorPrices[name]
                        ? setPrecision(new Decimal(floorPrices[name] ?? 0))
                        : "?",
                    })}
                  </Label>
                </OuterPanel>
              </div>
            ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center">
        <div className="flex flex-col items-start">
          <div className="flex items-center">
            <Box image={ITEM_DETAILS[selected].image} disabled />
            <span className="text-sm">{selected}</span>
          </div>
          <Label
            type={
              sfl / quantity < (floorPrices[selected] ?? 0)
                ? "danger"
                : sfl / quantity > (floorPrices[selected] ?? 0)
                ? "success"
                : "warning"
            }
            className="my-1"
          >
            {t("bumpkinTrade.floorPrice", {
              price: floorPrices[selected]
                ? setPrecision(new Decimal(floorPrices[selected] ?? 0))
                : "?",
            })}
          </Label>
        </div>
        <div className="flex flex-col items-end pr-1">
          <Label
            type={inventory[selected]?.lt(quantity) ? "danger" : "info"}
            className="my-1"
          >
            {t("bumpkinTrade.available")}
          </Label>
          <span className="text-sm mr-1">
            {`${setPrecision(new Decimal(inventory?.[selected] ?? 0), 0)}`}
          </span>
        </div>
      </div>

      <div className="flex">
        <div className="w-1/2 mr-1">
          <div className="flex items-center">
            <Label
              icon={SUNNYSIDE.icons.basket}
              className="my-1 ml-2"
              type="default"
            >
              {t("bumpkinTrade.quantity")}
            </Label>
            {quantity > (TRADE_LIMITS[selected] ?? 0) && (
              <Label type="danger" className="my-1 ml-2 mr-1">
                {t("bumpkinTrade.max", { max: TRADE_LIMITS[selected] ?? 0 })}
              </Label>
            )}
          </div>

          <input
            style={{
              boxShadow: "#b96e50 0px 1px 1px 1px inset",
              border: "2px solid #ead4aa",
            }}
            type="number"
            placeholder="0"
            min={1}
            value={quantityDisplay}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              // Strip the leading zero from numbers
              if (
                /^0+(?!\.)/.test(e.target.value) &&
                e.target.value.length > 1
              ) {
                e.target.value = e.target.value.replace(/^0/, "");
              }

              if (e.target.value === "") {
                setQuantityDisplay(""); // Reset to 0 if input is empty
              } else if (VALID_INTEGER.test(e.target.value)) {
                const amount = e.target.value.slice(0, INPUT_MAX_CHAR);
                setQuantityDisplay(amount);
              }
            }}
            className={classNames(
              "mb-2 text-shadow mr-2 rounded-sm shadow-inner shadow-black bg-brown-200 w-full p-2 h-10 placeholder-error",
              {
                "text-error":
                  inventory[selected]?.lt(quantity) ||
                  quantity > (TRADE_LIMITS[selected] ?? 0) ||
                  quantity === 0, // Add condition to change text color to red when quantity is 0
              }
            )}
          />
        </div>
        <div className="flex-1 flex flex-col items-end ml-2">
          <div className="flex items-center">
            {sfl > MAX_SFL && (
              <Label type="danger" className="my-1 ml-2 mr-1">
                {t("bumpkinTrade.max", { max: MAX_SFL })}
              </Label>
            )}
            <Label icon={token} type="default" className="my-1 ml-2 mr-1">
              {t("bumpkinTrade.price")}
            </Label>
          </div>
          <input
            style={{
              boxShadow: "#b96e50 0px 1px 1px 1px inset",
              border: "2px solid #ead4aa",
              textAlign: "right",
            }}
            type="number"
            placeholder="0"
            value={sflDisplay}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              // Strip the leading zero from numbers
              if (
                /^0+(?!\.)/.test(e.target.value) &&
                e.target.value.length > 1
              ) {
                e.target.value = e.target.value.replace(/^0/, "");
              }

              if (e.target.value === "") {
                setSflDisplay(""); // Reset to 0 if input is empty
              } else if (VALID_FOUR_DECIMAL_NUMBER.test(e.target.value)) {
                const amount = e.target.value.slice(0, INPUT_MAX_CHAR);
                setSflDisplay(amount);
              }
            }}
            className={classNames(
              "mb-2 text-shadow  rounded-sm shadow-inner shadow-black bg-brown-200 w-full p-2 h-10 placeholder-error",
              {
                "text-error": maxSFL || sfl === 0,
              }
            )}
          />
        </div>
      </div>

      <div
        className="flex justify-between"
        style={{
          borderBottom: "1px solid #ead4aa",
          padding: "5px 5px 5px 2px",
        }}
      >
        <span className="text-xs"> {t("bumpkinTrade.listingPrice")}</span>
        <p className="text-xs">{`${setPrecision(new Decimal(sfl)).toFixed(
          4
        )} SFL`}</p>
      </div>
      <div
        className="flex justify-between"
        style={{
          borderBottom: "1px solid #ead4aa",
          padding: "5px 5px 5px 2px",
        }}
      >
        <span className="text-xs">
          {t("bumpkinTrade.pricePerUnit", { resource: selected })}
        </span>
        <p className="text-xs">
          {quantity === 0
            ? "0.0000 SFL"
            : `${setPrecision(new Decimal(sfl / quantity)).toFixed(4)} SFL`}
        </p>
      </div>
      <div
        className="flex justify-between"
        style={{
          borderBottom: "1px solid #ead4aa",
          padding: "5px 5px 5px 2px",
        }}
      >
        <span className="text-xs"> {t("bumpkinTrade.tradingFee")}</span>
        <p className="text-xs">{`${setPrecision(new Decimal(sfl * 0.1)).toFixed(
          4
        )} SFL`}</p>
      </div>
      <div
        className="flex justify-between"
        style={{
          padding: "5px 5px 5px 2px",
        }}
      >
        <span className="text-xs"> {t("bumpkinTrade.youWillReceive")}</span>
        <p className="text-xs">{`${setPrecision(new Decimal(sfl * 0.9)).toFixed(
          4
        )} SFL`}</p>
      </div>
      <div className="flex mt-2">
        <Button onClick={onCancel} className="mr-1">
          {t("bumpkinTrade.cancel")}
        </Button>
        <Button
          disabled={
            maxSFL ||
            (inventory[selected]?.lt(quantity) ?? false) ||
            quantity === 0 || // Disable when quantity is 0
            sfl === 0 || // Disable when sfl is 0
            isSaving
          }
          onClick={() => onList({ [selected]: quantity }, sfl)}
        >
          {t("bumpkinTrade.list")}
        </Button>
      </div>
    </>
  );
};

const TradeDetails: React.FC<{
  trade: TradeListing;
  isOldListing: boolean;
  onCancel: () => void;
  onClaim: () => void;
}> = ({ trade, onCancel, onClaim, isOldListing }) => {
  const { t } = useAppTranslation();
  if (trade.boughtAt) {
    return (
      <div>
        <OuterPanel>
          <div className="flex justify-between">
            <div>
              <div className="flex flex-wrap">
                {getKeys(trade.items).map((name) => (
                  <Box
                    image={ITEM_DETAILS[name].image}
                    count={new Decimal(trade.items[name] ?? 0)}
                    disabled
                    key={name}
                  />
                ))}

                <div>
                  <Label
                    type="success"
                    className="ml-1 mt-0.5"
                  >{`Bought`}</Label>
                  <div className="flex items-center mr-0.5 mt-1">
                    <img src={token} className="h-6 mr-1" />
                    <p className="text-xs">{`${trade.sfl} SFL`}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-between h-full">
              <Button className="mb-1" onClick={onClaim}>
                {t("claim")}
              </Button>
            </div>
          </div>
        </OuterPanel>
      </div>
    );
  }

  const text = "Cancel Old";
  return (
    <>
      <OuterPanel>
        <div className="flex justify-between ">
          <div className="flex flex-wrap">
            {getKeys(trade.items).map((name) => (
              <Box
                image={ITEM_DETAILS[name].image}
                count={new Decimal(trade.items[name] ?? 0)}
                disabled
                key={name}
              />
            ))}
            <div>
              <Label type="default" className="ml-1 mt-0.5">{`Listed`}</Label>
              <div className="flex items-center mr-0.5 mt-1">
                <img src={token} className="h-6 mr-1" />
                <p className="text-xs">{`${trade.sfl} SFL`}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-between h-full">
            <Button className="mb-1" onClick={onCancel}>
              {isOldListing ? text : t("cancel")}
            </Button>
          </div>
        </div>
      </OuterPanel>
    </>
  );
};

export const Trade: React.FC<{ floorPrices: FloorPrices }> = ({
  floorPrices,
}) => {
  const { gameService } = useContext(Context);
  const [gameState] = useActor(gameService);

  const { openModal } = useContext(ModalContext);

  const [showListing, setShowListing] = useState(false);

  const isVIP = hasVipAccess(gameState.context.state.inventory);

  // Show listings
  const trades = gameState.context.state.trades?.listings ?? {};
  const { t } = useAppTranslation();
  const level = getBumpkinLevel(
    gameState.context.state.bumpkin?.experience ?? 0
  );

  const onList = (items: Items, sfl: number) => {
    gameService.send("LIST_TRADE", {
      sellerId: gameState.context.farmId,
      items,
      sfl,
    });

    setShowListing(false);
  };

  const onCancel = (listingId: string, listingType: string) => {
    if (listingId.length < 38) {
      gameService.send("trade.cancelled", { tradeId: listingId });
      gameService.send("SAVE");
    } else
      gameService.send("DELETE_TRADE_LISTING", {
        sellerId: gameState.context.farmId,
        listingId,
        listingType,
      });
  };

  if (level < 10) {
    return (
      <div className="relative">
        <div className="p-1 flex flex-col items-center">
          <img src={lock} className="w-1/5 mx-auto my-2 img-highlight-heavy" />
          <p className="text-sm">{t("bumpkinTrade.minLevel")}</p>
          <p className="text-xs mb-2">{t("statements.lvlUp")}</p>
        </div>
      </div>
    );
  }

  if (showListing) {
    return (
      <ListTrade
        inventory={gameState.context.state.inventory}
        onCancel={() => setShowListing(false)}
        onList={onList}
        isSaving={gameState.matches("autosaving")}
        floorPrices={floorPrices}
      />
    );
  }

  if (getKeys(trades).length === 0) {
    return (
      <div className="relative">
        <div className="pl-2 pt-2">
          <VIPAccess
            isVIP={isVIP}
            onUpgrade={() => {
              openModal("BUY_BANNER");
            }}
          />
        </div>
        <div className="p-1 flex flex-col items-center">
          <img
            src={tradeIcon}
            className="w-1/5 mx-auto my-2 img-highlight-heavy"
          />
          <p className="text-sm">{t("bumpkinTrade.noTradeListed")}</p>
          <p className="text-xs mb-2">{t("bumpkinTrade.sell")}</p>
        </div>

        <Button onClick={() => setShowListing(true)} disabled={!isVIP}>
          {t("list.trade")}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="pl-2 pt-2">
        <VIPAccess
          isVIP={isVIP}
          onUpgrade={() => {
            openModal("BUY_BANNER");
          }}
        />
      </div>
      {getKeys(trades).map((listingId, index) => {
        return (
          <div className="mt-2" key={index}>
            <TradeDetails
              onCancel={() =>
                onCancel(listingId, makeListingType(trades[listingId].items))
              }
              onClaim={() => {
                gameService.send("trade.received", {
                  tradeId: listingId,
                });
                gameService.send("SAVE");
              }}
              trade={trades[listingId]}
              isOldListing={listingId.length < 38}
            />
          </div>
        );
      })}
      {getKeys(trades).length < 3 && (
        <div className="relative mt-2">
          <Button onClick={() => setShowListing(true)} disabled={!isVIP}>
            {t("list.trade")}
          </Button>
        </div>
      )}
      {getKeys(trades).length >= 3 && (
        <div className="relative my-2">
          <Label type="danger" icon={lock} className="mx-auto">
            {t("bumpkinTrade.maxListings")}
          </Label>
        </div>
      )}
    </div>
  );
};
