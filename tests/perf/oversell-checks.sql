-- TC-NFR-02 post-run integrity checks. Replace the date with TEST_DATE. Each query must return 0 rows.
-- 1. No item oversold
SELECT id, quantity, "orderedQty" FROM "DailyMenuItem"
WHERE "menuDate" = '2026-11-17' AND "orderedQty" > quantity;          -- expect 0 rows

-- 2. Counter matches the actual active orders
SELECT d.id, d."orderedQty", COALESCE(SUM(oi.qty),0) AS actual
FROM "DailyMenuItem" d
LEFT JOIN "OrderItem" oi ON oi."dailyMenuItemId" = d.id
LEFT JOIN "Order" o ON o.id = oi."orderId" AND o.status <> 'CANCELLED'
WHERE d."menuDate" = '2026-11-17'
GROUP BY d.id HAVING d."orderedQty" <> COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN oi.qty END),0);  -- expect 0 rows

-- 3. No employee with two active orders
SELECT "userId", COUNT(*) FROM "Order"
WHERE "orderDate" = '2026-11-17' AND status <> 'CANCELLED'
GROUP BY "userId" HAVING COUNT(*) > 1;                                -- expect 0 rows
