import { renderRole as renderEnergyRole } from "./energy.js";

export const roleId = "Бухгалтерия";

export function renderRole(user, options = {}) {
  return renderEnergyRole(user, {
    ...options,
    actions: Array.isArray(options.actions) ? options.actions : [],
    showGroupToggle: false,
    showQuickAccess: false,
  });
}
