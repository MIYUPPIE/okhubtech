// SQLite gives Prisma no enum support (see the note in prisma/schema.prisma),
// so Order.status and Order.deliveryMethod are plain `string` columns and the
// generated Prisma Client types them as `string`, not a literal union — a
// typo'd status would otherwise compile silently. These const arrays are the
// one place both directions (writing a status, reading one back) are checked
// against the same literal set before Prisma widens it back to `string`.

export const ORDER_STATUSES = ["PENDING", "PAID", "FAILED", "ABANDONED"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const DELIVERY_METHODS = ["DOWNLOAD", "EMAIL"] as const;
export type DeliveryMethodValue = (typeof DELIVERY_METHODS)[number];
