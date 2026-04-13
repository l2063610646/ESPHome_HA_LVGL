import { SWITCH_STYLE_BUTTON } from "../../constants.js";

export function renderSwitchEsphomeWidget(entity, renderers) {
  return entity.props.style === SWITCH_STYLE_BUTTON
    ? renderers.renderSingleSwitchButtonWidget(entity)
    : renderers.renderSingleSwitchToggleWidget(entity);
}
