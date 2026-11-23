import QRCode from 'qrcode';
import { route } from '@/server/http/route';
import { idParams } from '@/server/http/schemas';
import { getOrderFor } from '@/server/services/orderService';

export const dynamic = 'force-dynamic';

/** O4: QR PNG for the owner. Encodes the pickup code only (US-11 AC4). */
export const GET = route({ roles: ['EMPLOYEE'], params: idParams }, async ({ params, user }) => {
  const order = await getOrderFor(params.id, user);
  const png = await QRCode.toBuffer(order.pickupCode, { type: 'png', width: 320, margin: 2, errorCorrectionLevel: 'M' });
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, no-store' } });
});
