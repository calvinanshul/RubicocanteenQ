-- BR4 (revised): one OPEN order per user per day. A collected, cancelled or no-show order no longer
-- blocks a new one, so an employee can order again once the previous order is completed.
DROP INDEX IF EXISTS "order_one_active_per_day";
CREATE UNIQUE INDEX "order_one_active_per_day"
  ON "Order" ("userId", "orderDate")
  WHERE "status" IN ('PLACED', 'PREPARING', 'READY');
