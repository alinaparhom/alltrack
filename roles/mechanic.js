import { renderRole as renderEnergyRole } from "./energy.js";

export const roleId = "Механик";

// Права механика совпадают с правами ответственного. Дополнительная карточка
// «Механизмы» добавляется на главной странице в app.js.
export const renderRole = renderEnergyRole;
