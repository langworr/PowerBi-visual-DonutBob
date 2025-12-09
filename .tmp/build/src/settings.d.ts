import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";
import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;
declare class DonutCardFormattingSettings extends FormattingSettingsCard {
    showCircle: formattingSettings.ToggleSwitch;
    topLevelSlice: formattingSettings.ToggleSwitch;
    fillColor: formattingSettings.ColorPicker;
    fillTransparency: formattingSettings.NumUpDown;
    thickness: formattingSettings.Slider;
    name: string;
    displayName: string;
    slices: Array<FormattingSettingsSlice>;
}
declare class CentreCardFormattingSettings extends FormattingSettingsCard {
    showCentre: formattingSettings.ToggleSwitch;
    valueFontColor: formattingSettings.ColorPicker;
    valueFontSize: formattingSettings.NumUpDown;
    labelText: formattingSettings.TextInput;
    labelFontColor: formattingSettings.ColorPicker;
    labelFontSize: formattingSettings.NumUpDown;
    topLevelSlice: formattingSettings.ToggleSwitch;
    name: string;
    displayName: string;
    slices: Array<FormattingSettingsSlice>;
}
/**
 * Visual settings model
 */
export declare class VisualFormattingSettingsModel extends FormattingSettingsModel {
    donutCard: DonutCardFormattingSettings;
    centreCard: CentreCardFormattingSettings;
    cards: (DonutCardFormattingSettings | CentreCardFormattingSettings)[];
}
export {};
