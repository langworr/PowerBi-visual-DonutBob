import powerbi from "powerbi-visuals-api";
import SubSelectableDirectEdit = powerbi.visuals.SubSelectableDirectEdit;
import SubSelectableDirectEditStyle = powerbi.visuals.SubSelectableDirectEditStyle;

import { ICenterLabelReference, IDetailLabelsReference, IFontReference, ILegendReference, IOuterLineReference, IPiesReference } from "./interfaces";
import { DonutBobObjectNames } from "../donutBobSettingsModel";

export const TitleEdit: SubSelectableDirectEdit = {
    reference: {
        objectName: DonutBobObjectNames.Legend.name,
        propertyName: "titleText"
    },
    style: SubSelectableDirectEditStyle.HorizontalLeft,
}

export const visualTitleEditSubSelection = JSON.stringify(TitleEdit);

const createBaseFontReference = (objectName: string, colorName: string = ""): IFontReference => {
    return {
        fontFamily: {
            objectName: objectName,
            propertyName: "fontFamily"
        },
        bold: {
            objectName: objectName,
            propertyName: "fontBold"
        },
        italic: {
            objectName: objectName,
            propertyName: "fontItalic"
        },
        underline: {
            objectName: objectName,
            propertyName: "fontUnderline"
        },
        fontSize: {
            objectName: objectName,
            propertyName: "fontSize"
        },
        color: {
            objectName: objectName,
            propertyName: colorName || "color"
        }
    }
}

export const legendReferences: ILegendReference = {
    ...createBaseFontReference(DonutBobObjectNames.Legend.name, "labelColor"),
    cardUid: "Visual-legend-card",
    groupUid: "legend-group",
    show: {
        objectName: DonutBobObjectNames.Legend.name,
        propertyName: "show",
    },
    position: {
        objectName: DonutBobObjectNames.Legend.name,
        propertyName: "position",
    },
    titleText: {
        objectName: DonutBobObjectNames.Legend.name,
        propertyName: "titleText",
    },
    showTitle: {
        objectName: DonutBobObjectNames.Legend.name,
        propertyName: "showTitle",
    }
}

export const centerLabelReferences: ICenterLabelReference = {
    ...createBaseFontReference(DonutBobObjectNames.CenterLabel.name),
    cardUid: "Visual-label-card",
    groupUid: "label-group",
    show: {
        objectName: DonutBobObjectNames.CenterLabel.name,
        propertyName: "show"
    }
}

export const detailLabelsReferences: IDetailLabelsReference = {
    ...createBaseFontReference(DonutBobObjectNames.DetailLabels.name),
    cardUid: "Visual-labels-card",
    groupUid: "options-group",
    displayUnits: {
        objectName: DonutBobObjectNames.DetailLabels.name,
        propertyName: "displayUnits"
    },
    precision: {
        objectName: DonutBobObjectNames.DetailLabels.name,
        propertyName: "precision"
    },
    show: {
        objectName: DonutBobObjectNames.DetailLabels.name,
        propertyName: "show"
    },
    position: {
        objectName: DonutBobObjectNames.DetailLabels.name,
        propertyName: "position"
    },
    detailLabelsContent: {
        objectName: DonutBobObjectNames.DetailLabels.name,
        propertyName: "detailLabelsContent"
    }
}

export const outerLineReferences: IOuterLineReference = {
    ...createBaseFontReference(DonutBobObjectNames.OuterLine.name, "textColor"),
    cardUid: "Visual-outerLine-card",
    groupUid: "outerLine-group",
    thickness: {
        objectName: DonutBobObjectNames.OuterLine.name,
        propertyName: "thickness"
    },
    show: {
        objectName: DonutBobObjectNames.OuterLine.name,
        propertyName: "show"
    },
    linesColor: {
        objectName: DonutBobObjectNames.OuterLine.name,
        propertyName: "color"
    },
    showGrid: {
        objectName: DonutBobObjectNames.OuterLine.name,
        propertyName: "showGrid"
    },
    showLines: {
        objectName: DonutBobObjectNames.OuterLine.name,
        propertyName: "showStraightLines"
    },
    showTicks: {
        objectName: DonutBobObjectNames.OuterLine.name,
        propertyName: "showGridTicksValues"
    }
}

export const piesReferences: IPiesReference = {
    cardUid: "Visual-pies-card",
    groupUid: "pies-group",
    fill: {
        objectName: DonutBobObjectNames.Pies.name,
        propertyName: "fill"
    }
}
