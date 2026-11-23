-- Business-rule constraints Prisma can't express (05-data-model.md §2)

-- BR4: one active (non-cancelled) order per user per day
CREATE UNIQUE INDEX "order_one_active_per_day"
  ON "Order" ("userId", "orderDate")
  WHERE "status" <> 'CANCELLED';

-- US-06 AC4: unique active menu-item name, case-insensitive
CREATE UNIQUE INDEX "menu_item_active_name"
  ON "MenuItem" (lower("name"))
  WHERE "isActive" = true;

-- BR2: last line of defence against overselling
ALTER TABLE "DailyMenuItem"
  ADD CONSTRAINT "ordered_within_quantity"
  CHECK ("orderedQty" >= 0 AND "orderedQty" <= "quantity");

-- Daily quantity 1–1000 (US-07 AC3)
ALTER TABLE "DailyMenuItem"
  ADD CONSTRAINT "daily_quantity_range"
  CHECK ("quantity" BETWEEN 1 AND 1000);

-- BR3: at least one of each item
ALTER TABLE "OrderItem"
  ADD CONSTRAINT "order_item_qty_positive"
  CHECK ("qty" >= 1);

-- US-06 AC2: ₹1–₹1,000
ALTER TABLE "MenuItem"
  ADD CONSTRAINT "menu_item_price_range"
  CHECK ("pricePaise" BETWEEN 100 AND 100000);

-- Single settings row
ALTER TABLE "Settings"
  ADD CONSTRAINT "settings_single_row"
  CHECK ("id" = 1);
