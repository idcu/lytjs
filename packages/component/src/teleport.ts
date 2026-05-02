import type { ComponentOptions } from './types';

export interface TeleportProps {
  to: string | Element;
  disabled?: boolean;
}

export const Teleport: ComponentOptions = {
  name: 'Teleport',
  props: {
    to: { type: [String, Object] as any, required: true },
    disabled: { type: Boolean, default: false },
  },
  setup() {
    // Teleport is handled by the vdom patch algorithm.
    // The actual Teleport logic (mounting to target, disabled handling)
    // lives in vdom's patch function (mountTeleport / patchTeleport).
  },
};
