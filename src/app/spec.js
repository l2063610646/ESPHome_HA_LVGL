import {
  BOARD_CONFIGS,
  DEFAULT_HEIGHT,
  DEFAULT_LIGHT_HEIGHT,
  DEFAULT_LIGHT_WIDTH,
  DEFAULT_THERMO_HEIGHT,
  DEFAULT_THERMO_WIDTH,
  DEFAULT_WIDTH,
  ENTITY_CAPABILITIES,
  LIGHT_ICON_PATHS,
  LIGHT_STYLE_ICON,
  SWITCH_BUTTON_STYLE_HEIGHT,
  SWITCH_STYLE_BUTTON,
  SWITCH_STYLE_TOGGLE,
  THERMO_HYGROMETER_STYLE_COMPACT,
  THERMO_ICON_PATHS,
} from "./constants.js";

export const initialSpec = {
  entities: [],
};

export function createInitialState() {
  const state = {
    entities: normalizeEntities(initialSpec.entities),
    selectedId: null,
    drag: null,
    board: "nextion_35",
    rotation: 0,
    screenBgColor: "0xF3EFE7",
    deviceName: "onx3248g035",
    friendlyName: "",
    wifiSsid: "",
    wifiPassword: "",
    canvasWidth: BOARD_CONFIGS.nextion_35.width,
    canvasHeight: BOARD_CONFIGS.nextion_35.height,
  };
  updateCanvasDimensions(state);
  state.selectedId = state.entities[0]?.id ?? null;
  return state;
}

export function sanitizeDeviceName(value) {
  let normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!normalized) {
    normalized = "esphome-device";
  }

  return normalized;
}

export function getDeviceNameValidation(value) {
  const raw = String(value ?? "");
  const trimmed = raw.trim();
  const sanitized = sanitizeDeviceName(raw);
  const isValid = trimmed.length > 0 && /^[a-z0-9_-]+$/.test(trimmed);

  if (!trimmed) {
    return {
      isValid: false,
      sanitized,
      message: "Device name is required. Supported characters: lowercase a-z, 0-9, '-' and '_'.",
    };
  }

  if (!isValid) {
    return {
      isValid: false,
      sanitized,
      message: `Supported characters: lowercase a-z, 0-9, '-' and '_'. Generated YAML will use \"${sanitized}\".`,
    };
  }

  return {
    isValid: true,
    sanitized,
    message: "",
  };
}

export function generateSpecYaml(state) {
  const lines = [];
  const deviceName = sanitizeDeviceName(state.deviceName);
  lines.push(`base_config: ${state.board}`);
  if (state.rotation !== 0) {
    lines.push(`rotation: ${state.rotation}`);
  }
  lines.push("device:");
  lines.push(`  name: ${quoteYaml(deviceName)}`);
  if (state.friendlyName) {
    lines.push(`  friendly_name: ${quoteYaml(state.friendlyName)}`);
  }
  lines.push("wifi:");
  lines.push(`  ssid: ${quoteYaml(state.wifiSsid)}`);
  lines.push(`  password: ${quoteYaml(state.wifiPassword)}`);
  lines.push("screen:");
  lines.push(`  bg_color: ${quoteYaml(state.screenBgColor)}`);
  lines.push("entities:");
  state.entities.forEach((entity) => {
    if (entity.type === "switch" || entity.type === "light") {
      lines.push(`  - entityid: ${quoteYaml(entity.entityids[0])}`);
    } else {
      lines.push("  - entityids:");
      lines.push(`      - ${quoteYaml(entity.entityids[0])}`);
      lines.push(`      - ${quoteYaml(entity.entityids[1])}`);
    }
    lines.push(`    type: ${entity.type}`);
    lines.push("    props:");
    lines.push(`      style: ${quoteYaml(normalizeStyle(entity.type, entity.props.style))}`);
    lines.push(`      x: ${entity.props.x}`);
    lines.push(`      y: ${entity.props.y}`);
    lines.push(`      width: ${entity.props.width}`);
    lines.push(`      height: ${entity.props.height}`);
    lines.push(`      title: ${quoteYaml(entity.props.title)}`);
    if (entity.type === "thermo_hygrometer") {
      if (normalizeIconSource(entity.props.temp_icon)) {
        lines.push(`      temp_icon: ${quoteYaml(entity.props.temp_icon)}`);
      }
      if (normalizeIconSource(entity.props.hum_icon)) {
        lines.push(`      hum_icon: ${quoteYaml(entity.props.hum_icon)}`);
      }
    }
    if (entity.type === "light") {
      if (normalizeIconSource(entity.props.off_icon)) {
        lines.push(`      off_icon: ${quoteYaml(entity.props.off_icon)}`);
      }
      if (normalizeIconSource(entity.props.on_icon)) {
        lines.push(`      on_icon: ${quoteYaml(entity.props.on_icon)}`);
      }
    }
  });
  return `${lines.join("\n")}\n`;
}

export function parseSpecYaml(source) {
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.replace(/\t/g, "  "))
    .filter((line) => line.trim() !== "" && !line.trim().startsWith("#"));

  const entities = [];
  let current = null;
  let inProps = false;
  let inEntityIds = false;
  let inScreen = false;
  let inWifi = false;
  let inDevice = false;

  let rotation = 0;
  let board = null;
  const screen = {};
  const wifi = {};
  const device = {};

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("base_config:")) {
      const nextBoard = readYamlValue(trimmed.slice("base_config:".length).trim());
      board = BOARD_CONFIGS[nextBoard] ? nextBoard : null;
      return;
    }
    if (trimmed.startsWith("rotation:")) {
      rotation = parseInt(trimmed.slice("rotation:".length).trim(), 10) || 0;
      return;
    }
    if (trimmed === "device:") {
      inDevice = true;
      inWifi = false;
      inScreen = false;
      inProps = false;
      inEntityIds = false;
      return;
    }
    if (inDevice && line.startsWith("  ") && trimmed.includes(":")) {
      const separatorIndex = trimmed.indexOf(":");
      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      device[key] = readYamlValue(rawValue);
      return;
    }
    if (trimmed === "wifi:") {
      inDevice = false;
      inWifi = true;
      inScreen = false;
      inProps = false;
      inEntityIds = false;
      return;
    }
    if (inWifi && line.startsWith("  ") && trimmed.includes(":")) {
      const separatorIndex = trimmed.indexOf(":");
      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      wifi[key] = readYamlValue(rawValue);
      return;
    }
    if (trimmed === "screen:") {
      inDevice = false;
      inWifi = false;
      inScreen = true;
      inProps = false;
      inEntityIds = false;
      return;
    }
    if (inScreen && line.startsWith("  ") && trimmed.includes(":")) {
      const separatorIndex = trimmed.indexOf(":");
      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      screen[key] = readYamlValue(rawValue);
      return;
    }
    if (trimmed === "entities:") {
      inDevice = false;
      inWifi = false;
      inScreen = false;
      return;
    }
    if (trimmed.startsWith("- entityid:")) {
      if (current) {
        entities.push(current);
      }
      current = {
        entityid: readYamlValue(trimmed.slice("- entityid:".length).trim()),
        type: "switch",
        props: {},
      };
      inProps = false;
      inEntityIds = false;
      return;
    }
    if (trimmed === "- entityids:") {
      if (current) {
        entities.push(current);
      }
      current = {
        entityids: [],
        type: "switch",
        props: {},
      };
      inProps = false;
      inEntityIds = true;
      return;
    }
    if (!current) {
      throw new Error("Invalid YAML: expected `entities:` followed by entity items.");
    }
    if (inEntityIds && trimmed.startsWith("- ")) {
      current.entityids.push(readYamlValue(trimmed.slice(2).trim()));
      return;
    }
    if (trimmed.startsWith("type:")) {
      current.type = readYamlValue(trimmed.slice("type:".length).trim());
      inEntityIds = false;
      return;
    }
    if (trimmed === "props:") {
      inProps = true;
      inEntityIds = false;
      return;
    }
    if (inProps && trimmed.includes(":")) {
      const separatorIndex = trimmed.indexOf(":");
      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      current.props[key] = readYamlValue(rawValue);
      return;
    }
    throw new Error(`Unsupported line: ${trimmed}`);
  });

  if (current) {
    entities.push(current);
  }

  return { board, entities, rotation, screen, wifi, device };
}

export function normalizeEntities(entities, canvasWidth = BOARD_CONFIGS.nextion_35.width, canvasHeight = BOARD_CONFIGS.nextion_35.height) {
  return entities.map((entity) => normalizeEntity(entity, canvasWidth, canvasHeight));
}

export function normalizeEntity(entity, canvasWidth = BOARD_CONFIGS.nextion_35.width, canvasHeight = BOARD_CONFIGS.nextion_35.height) {
  const type = normalizeType(entity.type || "switch");
  const props = entity.props || {};
  const width = clampNumber(props.width ?? defaultWidthForType(type), minWidthForType(type), canvasWidth);
  const style = normalizeStyle(type, props.style);
  const height = clampNumber(props.height ?? defaultHeightForType(type, style), minHeightForType(type, style), canvasHeight);
  const entityids = normalizeEntityIds(entity, type);
  return {
    id: `id-${Math.random().toString(36).slice(2, 11)}`,
    type,
    entityids,
    props: {
      x: clamp(clampNumber(props.x ?? 0, 0, canvasWidth), 0, canvasWidth - width),
      y: clamp(clampNumber(props.y ?? 0, 0, canvasHeight), 0, canvasHeight - height),
      width,
      height,
      title: String(props.title || defaultTitleForType(type, entityids)),
      style,
      temp_icon: normalizeIconSource(
        props.temp_icon || props.temp_image || props.temperature_icon || THERMO_ICON_PATHS.temp
      ),
      hum_icon: normalizeIconSource(
        props.hum_icon || props.humidity_icon || props.hum_image || THERMO_ICON_PATHS.hum
      ),
      off_icon: normalizeIconSource(
        props.off_icon || props.off_image || props.icon_off || LIGHT_ICON_PATHS.off
      ),
      on_icon: normalizeIconSource(
        props.on_icon || props.on_image || props.icon_on || LIGHT_ICON_PATHS.on
      ),
    },
  };
}

export function updateCanvasDimensions(state) {
  const config = BOARD_CONFIGS[state.board];
  const isRotated = state.rotation === 90 || state.rotation === 270;
  state.canvasWidth = isRotated ? config.height : config.width;
  state.canvasHeight = isRotated ? config.width : config.height;

  state.entities.forEach((entity) => {
    entity.props.width = clamp(entity.props.width, minWidthForType(entity.type), state.canvasWidth);
    entity.props.height = clamp(
      entity.props.height,
      minHeightForType(entity.type, entity.props.style),
      state.canvasHeight
    );
    entity.props.x = clamp(entity.props.x, 0, state.canvasWidth - entity.props.width);
    entity.props.y = clamp(entity.props.y, 0, state.canvasHeight - entity.props.height);
  });
}

export function normalizeEntityIds(entity, type) {
  const capability = getEntityCapability(type);
  const defaults = capability.entityFields.map((field, index) => field.defaultValue(index + 1));
  const ids = Array.isArray(entity.entityids)
    ? entity.entityids
    : Array.isArray(entity.entity_ids)
      ? entity.entity_ids
      : [];

  if (capability.entityFields.length === 1) {
    return [String(ids[0] || entity.entityid || entity.entity_id || defaults[0]).trim()];
  }

  return capability.entityFields.map((field, index) =>
    String(ids[index] || (index === 0 ? entity.entityid : "") || defaults[index]).trim()
  );
}

export function normalizeType(value) {
  if (value === "thermo_hygrometer") {
    return "thermo_hygrometer";
  }
  if (value === "light") {
    return "light";
  }
  return "switch";
}

export function normalizeStyle(type, value) {
  if (type === "switch") {
    return value === SWITCH_STYLE_BUTTON ? SWITCH_STYLE_BUTTON : SWITCH_STYLE_TOGGLE;
  }
  if (type === "light") {
    return LIGHT_STYLE_ICON;
  }
  return THERMO_HYGROMETER_STYLE_COMPACT;
}

export function defaultTitleForType(type, entityids) {
  if (type === "thermo_hygrometer") {
    return "Temperature & Humidity";
  }
  if (type === "light") {
    return deriveTitle(entityids[0]);
  }
  return deriveTitle(entityids[0]);
}

export function defaultTitleForEntity(entity) {
  return defaultTitleForType(entity.type, entity.entityids);
}

export function defaultWidthForType(type) {
  if (type === "thermo_hygrometer") {
    return DEFAULT_THERMO_WIDTH;
  }
  if (type === "light") {
    return DEFAULT_LIGHT_WIDTH;
  }
  return DEFAULT_WIDTH;
}

export function defaultHeightForType(type, style = SWITCH_STYLE_TOGGLE) {
  if (type === "thermo_hygrometer") {
    return DEFAULT_THERMO_HEIGHT;
  }
  if (type === "light") {
    return DEFAULT_LIGHT_HEIGHT;
  }
  return style === SWITCH_STYLE_BUTTON ? SWITCH_BUTTON_STYLE_HEIGHT : DEFAULT_HEIGHT;
}

export function minWidthForType(type) {
  if (type === "thermo_hygrometer") {
    return 180;
  }
  if (type === "light") {
    return 150;
  }
  return 150;
}

export function minHeightForType(type, style = SWITCH_STYLE_TOGGLE) {
  if (type === "thermo_hygrometer") {
    return DEFAULT_THERMO_HEIGHT;
  }
  if (type === "light") {
    return DEFAULT_LIGHT_HEIGHT;
  }
  return style === SWITCH_STYLE_BUTTON ? SWITCH_BUTTON_STYLE_HEIGHT : 56;
}

export function normalizeOptionalColor(value) {
  const text = String(value || "").trim();
  return text || "";
}

export function getEffectiveFriendlyName(deviceName, friendlyName) {
  const explicitFriendlyName = String(friendlyName || "").trim();
  if (explicitFriendlyName) {
    return explicitFriendlyName;
  }
  return sanitizeDeviceName(deviceName).toUpperCase();
}

export function normalizeYamlColor(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "0xF3EFE7";
  }
  if (/^0x[0-9a-f]{6}$/i.test(text)) {
    return `0x${text.slice(2).toUpperCase()}`;
  }
  if (/^#[0-9a-f]{6}$/i.test(text)) {
    return `0x${text.slice(1).toUpperCase()}`;
  }
  return text;
}

export function yamlColorToCss(value) {
  const normalized = normalizeYamlColor(value);
  if (/^0x[0-9a-f]{6}$/i.test(normalized)) {
    return `#${normalized.slice(2)}`;
  }
  return normalized;
}

export function yamlColorToHtml(value) {
  const css = yamlColorToCss(value);
  return /^#[0-9a-f]{6}$/i.test(css) ? css : "#f3efe7";
}

export function htmlColorToYaml(value) {
  const text = String(value || "").trim();
  if (/^#[0-9a-f]{6}$/i.test(text)) {
    return `0x${text.slice(1).toUpperCase()}`;
  }
  return "0xF3EFE7";
}

export function normalizeIconSource(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }

  const normalized = text.replace(/\\/g, "/");
  if (normalized === "temp.png" || normalized === "./temp.png") {
    return THERMO_ICON_PATHS.temp;
  }
  if (normalized === "hum.png" || normalized === "./hum.png") {
    return THERMO_ICON_PATHS.hum;
  }
  if (normalized === "off.png" || normalized === "./off.png") {
    return LIGHT_ICON_PATHS.off;
  }
  if (normalized === "light.png" || normalized === "./light.png" || normalized === "on.png" || normalized === "./on.png") {
    return LIGHT_ICON_PATHS.on;
  }
  return text;
}

export function usesTopAlignedTitle(entity) {
  return entity.type === "switch" && entity.props.style === SWITCH_STYLE_BUTTON;
}

export function shouldRenderWidgetTitle(entity) {
  return entity.type !== "thermo_hygrometer" && entity.type !== "light";
}

export function deriveTitle(entityId) {
  return entityId.split(".").slice(1).join(".") || entityId;
}

export function getEntityCapability(type) {
  return ENTITY_CAPABILITIES[type] || ENTITY_CAPABILITIES.switch;
}

export function createEntityDraft(type, index) {
  return getEntityCapability(type).createEntity(index);
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function clampNumber(value, min, max) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return min;
  }
  return clamp(Math.round(numeric), min, max);
}

export function readPendingNumber(value) {
  if (value === "") {
    return null;
  }
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return null;
  }
  return Math.round(numeric);
}

export function readYamlValue(rawValue) {
  if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
    return rawValue.slice(1, -1).replace(/\\"/g, '"');
  }
  if (rawValue.startsWith("'") && rawValue.endsWith("'")) {
    return rawValue.slice(1, -1).replace(/\\'/g, "'");
  }
  if (/^-?\d+$/.test(rawValue)) {
    return Number(rawValue);
  }
  return rawValue;
}

export function quoteYaml(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
