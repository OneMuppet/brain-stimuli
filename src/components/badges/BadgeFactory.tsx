"use client";

import type { BadgeType } from "@/domain/entities";
import { BadgeShield } from "./BadgeShield";
import { BadgeStar } from "./BadgeStar";
import { BadgeWings } from "./BadgeWings";
import { BadgeChevron } from "./BadgeChevron";
import { BadgeScroll } from "./BadgeScroll";
import { BadgeLightning } from "./BadgeLightning";
import { BadgeTriangle } from "./BadgeTriangle";
import { BadgeCrosshair } from "./BadgeCrosshair";

/**
 * Factory component that renders the correct badge based on badge type
 */
export function BadgeFactory({ badgeType }: { badgeType: BadgeType }) {
  switch (badgeType) {
    case "shield":
      return <BadgeShield />;
    case "star":
      return <BadgeStar />;
    case "wings":
      return <BadgeWings />;
    case "chevron":
      return <BadgeChevron />;
    case "scroll":
      return <BadgeScroll />;
    case "lightning":
      return <BadgeLightning />;
    case "triangle":
      return <BadgeTriangle />;
    case "crosshair":
      return <BadgeCrosshair />;
    default:
      return <BadgeShield />;
  }
}

