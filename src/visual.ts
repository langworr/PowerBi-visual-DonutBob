"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IColorPalette = powerbi.extensibility.IColorPalette;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import DataView = powerbi.DataView;
import * as d3 from "d3";
type Selection<T extends d3.BaseType> = d3.Selection<T, any, any, any>;

import { VisualFormattingSettingsModel } from "./settings";

export class Visual implements IVisual {
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;
    private host: IVisualHost;
    private colorPalette: IColorPalette;

    private svg: Selection<SVGElement>;
    private container: Selection<SVGGElement>;
    private textValue: Selection<SVGElement>;
    private textLabel: Selection<SVGElement>;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.colorPalette = this.host.colorPalette;
        this.svg = d3.select(options.element)
            .append("svg")
            .classed("donutCard", true);

        this.container = this.svg.append("g")
            .classed("container", true);

        this.textValue = this.container.append("text")
            .classed("textValue", true);

        this.textLabel = this.container.append("text")
            .classed("textLabel", true);

        this.formattingSettingsService = new FormattingSettingsService();
    }

    public update(options: VisualUpdateOptions) {
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(
            VisualFormattingSettingsModel,
            options.dataViews[0]
        );

        const width = options.viewport.width;
        const height = options.viewport.height;
        const radius = Math.min(width, height) / 2;
        const thickness = this.formattingSettings.donutCard.thickness.value;
        const innerRadius = radius * (100 - thickness) / 100;

        this.svg
            .attr("width", width)
            .attr("height", height);

        this.container.attr("transform", `translate(${width / 2}, ${height / 2})`);

        // Leggi i dati
        const dataView: DataView = options.dataViews && options.dataViews[0];
        let values: number[] = [];
        let categories: string[] = [];

        if (dataView?.categorical?.values && dataView.categorical.categories) {
            values = dataView.categorical.values[0].values.map(v => Number(v));
            categories = dataView.categorical.categories[0].values.map(c => String(c));
        }

        // Layout pie
        const pie = d3.pie<number>()
            .sort(null)
            .value(d => d);

        const arcs = pie(values);

        // Arc generator
        const arcGen = d3.arc<d3.PieArcDatum<number>>()
            .innerRadius(innerRadius)
            .outerRadius(radius);

        // Bind dei dati agli spicchi
        const slices = this.container.selectAll("path").data(arcs);

        slices.enter()
            .append("path")
            .merge(slices as any)
            .attr("d", arcGen)
            .style("fill", (d, i) => {
                const themeColor = this.colorPalette.getColor(categories[i]);
                return themeColor.value;
            })
            .style("fill-opacity", this.formattingSettings.donutCard.fillTransparency.value / 100);

        slices.exit().remove();

        // Testo centrale (totale o label)
        const total = d3.sum(values);

        if (this.formattingSettings.centreCard.showCentre.value) {
            const fontSizeValue = this.formattingSettings.centreCard.valueFontSize.value;
            const fontSizeLabel = this.formattingSettings.centreCard.labelFontSize.value;

            this.textValue
                .text(total.toString())
                .style("font-size", fontSizeValue + "px")
                .style("fill", this.formattingSettings.centreCard.valueFontColor.value.value)
                .attr("text-anchor", "middle")
                .attr("dy", "-0.2em");

            this.textLabel
                .text(this.formattingSettings.centreCard.labelText.value)
                .style("font-size", fontSizeLabel + "px")
                .style("fill", this.formattingSettings.centreCard.labelFontColor.value.value)
                .attr("text-anchor", "middle")
                .attr("dy", "1.2em");
        } else {
            this.textValue.text("");
            this.textLabel.text("");
        }
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
