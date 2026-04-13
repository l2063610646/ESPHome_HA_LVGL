import { MULTI_SWITCH_STYLE_LIST } from "../../constants.js";

export function renderMultiSwitchEsphomeWidget(entity, renderers) {
  return entity.props.style === MULTI_SWITCH_STYLE_LIST
    ? renderers.renderMultiSwitchListWidget(entity)
    : renderers.renderMultiSwitchWidget(entity);
}
