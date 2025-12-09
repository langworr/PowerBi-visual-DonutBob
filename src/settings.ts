"use strict";

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

class DonutCardFormattingSettings extends FormattingSettingsCard {
    fillColor = new formattingSettings.ColorPicker({
        name: "fillColor",
        displayName: "Fill Color",
        value: { value: "#BA00AB" }
    });

    fillTransparency = new formattingSettings.NumUpDown({
        name: "fillTransparency",
        displayName: "Fill Transparency (%)",
        value: 100
    });

    thickness = new formattingSettings.Slider({
        name: "thickness",
        displayName: "Thickness",
        value: 25,
        options: {
            minValue: {
                type: powerbi.visuals.ValidatorType.Min,
                value: 1
            },
            maxValue: {
                type: powerbi.visuals.ValidatorType.Max,
                value: 100
            },
        }
    });

    name: string = "circleCard";
    displayName: string = "Circle settings";
    slices: Array<FormattingSettingsSlice> = [
        this.thickness,
        this.fillColor,
        this.fillTransparency,

    ];
}

class CentreCardFormattingSettings extends FormattingSettingsCard {
    showCentre = new formattingSettings.ToggleSwitch({
        name: "showCentre",
        displayName: "Show Centre",
        value: true
    });

    valueFontColor = new formattingSettings.ColorPicker({
        name: "valueFontColor",
        displayName: "Value Font Color",
        value: { value: "#000000" }
    });

    valueFontSize = new formattingSettings.NumUpDown({
        name: "valueFontSize",
        displayName: "Value Font Size",
        value: 24
    });

    labelText = new formattingSettings.TextInput({
        name: "labelText",
        displayName: "Label Text",
        value: "Label Text",
        placeholder: "Enter label text"
    });

    labelFontColor = new formattingSettings.ColorPicker({
        name: "labelFontColor",
        displayName: "Label Font Color",
        value: { value: "#000000" }
    });

    labelFontSize = new formattingSettings.NumUpDown({
        name: "labelFontSize",
        displayName: "Label Font Size",
        value: 14
    });

    topLevelSlice: formattingSettings.ToggleSwitch = this.showCentre;
    name: string = "centreCard";
    displayName: string = "Centre settings";
    slices: Array<FormattingSettingsSlice> = [
        this.valueFontColor,
        this.valueFontSize,
        this.labelText,
        this.labelFontColor,
        this.labelFontSize
    ];
}

/**
 * Visual settings model
 */
export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    donutCard = new DonutCardFormattingSettings();
    centreCard = new CentreCardFormattingSettings();
    cards = [this.donutCard, this.centreCard];
}
