import { renderRole as renderEnergyRole } from "./energy.js";

export const roleId = "Бухгалтерия";

const accountingOnlyActions = [
  { id: "workers", title: "Рабочие", icon: "👷" },
  { id: "accept-other", title: "Принять за других", icon: "✅" },
];

export function renderRole(user, options = {}) {
  return renderEnergyRole(user, {
    ...options,
    actions: [
      ...(Array.isArray(options.actions) ? options.actions : []),
      ...accountingOnlyActions.filter(
        (fixedAction) =>
          !(Array.isArray(options.actions) ? options.actions : []).some(
            (action) => action?.id === fixedAction.id
          )
      ),
    ],
    showGroupToggle: false,
    showQuickAccess: false,
  });
}
