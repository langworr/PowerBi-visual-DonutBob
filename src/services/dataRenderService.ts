/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

import powerbi from "powerbi-visuals-api";

import IViewport = powerbi.IViewport;

// powerbi.extensibility.utils.chart
import {
    DataLabelManager,
    dataLabelUtils,
    dataLabelInterfaces,
} from "powerbi-visuals-utils-chartutils";
import ILabelLayout = dataLabelInterfaces.ILabelLayout;
import LabelEnabledDataPoint = dataLabelInterfaces.LabelEnabledDataPoint;

// d3
import "d3-transition";
import { Selection as d3Selection } from 'd3-selection';
import { sum as d3Sum, max as d3Max } from "d3-array";
import {
    Arc as d3Arc,
    arc as d3CreateArc,
    PieArcDatum as d3PieArcDatum,
    pie as d3Pie
} from "d3-shape";
import { interpolate as d3Interpolate } from "d3-interpolate";

// powerbi.extensibility.utils.svg
import { CssConstants } from "powerbi-visuals-utils-svgutils";
import ClassAndSelector = CssConstants.ClassAndSelector;
import createClassAndSelector = CssConstants.createClassAndSelector;

import { ITooltipServiceWrapper } from "powerbi-visuals-utils-tooltiputils";

// powerbi.extensibility.utils.type
import { pixelConverter as PixelConverter } from "powerbi-visuals-utils-typeutils";

// powerbi.extensibility.utils.formatting
import { textMeasurementService, interfaces } from "powerbi-visuals-utils-formattingutils";
import TextProperties = interfaces.TextProperties;


// powerbi.visuals
import ISelectionId = powerbi.visuals.ISelectionId;


class CircleTicksOptions {
    public diffPercent: number;
    public maxHeight: number;
    public ticksCount: number;
}

import {
    DonutDataPoint,
    DonutBobData,
    d3DonutDataPoint
} from "../dataInterfaces";

import {
    VisualLayout
} from "../visualLayout";

import { max, filter, isEmpty } from "lodash-es";
import { DonutBobObjectNames, DonutBobSettingsModel, OuterLineCardSettings } from '../donutBobSettingsModel';
import {HtmlSubSelectableClass, SubSelectableObjectNameAttribute, SubSelectableDisplayNameAttribute, SubSelectableTypeAttribute} from "powerbi-visuals-utils-onobjectutils";
import SubSelectionStylesType = powerbi.visuals.SubSelectionStylesType;
import ILocalizationManager = powerbi.extensibility.ILocalizationManager;

export class DataRenderService {
    private static DonutRadiusRatio: number = 0.9;
    private static DonutConflictRatio: number = 0.9;
    private static InsideLabelSizeRatio: number = 2.8;
    private static AnimationDuration: number = 0;
    private static CenterTextFontWidthCoefficient: number = 1.9;
    private static AxisTextWidthCoefficient: number = 1.75;
    private static PixelsBelowAxis: number = 5;
    private static LabelLinePadding: number = 4;
    private static LabelLineHeight: number = 25;
    private static LabelLineLegHeight: number = 10;

    private static DonutSlice: ClassAndSelector = createClassAndSelector("donutSlice");
    private static DonutHighlightedSlice: ClassAndSelector = createClassAndSelector("donutHighlightedSlice");
    private static CenterLabelClass: ClassAndSelector = createClassAndSelector("centerLabel");
    private static labelGraphicsContextClass: ClassAndSelector = createClassAndSelector("labels");
    private static linesGraphicsContextClass: ClassAndSelector = createClassAndSelector("lines");
    private static DataLabels: ClassAndSelector = createClassAndSelector("data-labels")
    private static LineLabel: ClassAndSelector = createClassAndSelector("line-label")
    private static OuterLine: ClassAndSelector = createClassAndSelector("outerLine");
    private static OuterCircleBorder: ClassAndSelector = createClassAndSelector("outerCircle");
    private static InnerCircleBorder: ClassAndSelector = createClassAndSelector("innerCircle");
    private static CircleLine: ClassAndSelector = createClassAndSelector("circleLine");
    private static CircleText: ClassAndSelector = createClassAndSelector("circleText");

    private data: DonutBobData;
    private formatMode: boolean;
    private layout: VisualLayout;
    private tooltipServiceWrapper: ITooltipServiceWrapper;
    private localizationManager: ILocalizationManager;
    private readonly settings: DonutBobSettingsModel;
    private readonly viewportRadius: number;
    private readonly maxHeight: number;
    private readonly totalWeight: number;
    private readonly dataPoints: d3DonutDataPoint[];
    private readonly highlightedDataPoints: d3DonutDataPoint[];
    private readonly arcSvg: d3Arc<DataRenderService, d3PieArcDatum<DonutDataPoint>>;
    private readonly ticksOptions: CircleTicksOptions;
    private readonly ticksRadiusArray: number[];
    private readonly tickValuesArray: number[];
    public innerRadius: number;
    public outerRadius: number;

    constructor(data: DonutBobData,
        settings: DonutBobSettingsModel,
        layout: VisualLayout,
        tooltipServiceWrapper: ITooltipServiceWrapper,
        localizationManager: ILocalizationManager,
        formatMode: boolean = false) {

        this.data = data;
        this.settings = settings;
        this.layout = layout;
        this.localizationManager = localizationManager;
        this.formatMode = formatMode;

        this.totalWeight = d3Sum(this.data.dataPoints, d => d.sliceWidth);
        this.dataPoints = this.createDataPoints(data, false, this.totalWeight);
        this.highlightedDataPoints = this.createDataPoints(data, true, this.totalWeight);
        this.maxHeight = d3Max(this.data.dataPoints, d => d.sliceHeight);
        this.viewportRadius = Math.min(this.layout.viewportIn.width, this.layout.viewportIn.height) / 2;
        this.tooltipServiceWrapper = tooltipServiceWrapper;

        // BOB inner radius
        this.innerRadius = 0.3 * (this.settings.detailLabels.show.value
            ? this.viewportRadius * DataRenderService.DonutRadiusRatio
            : this.viewportRadius);
        const showOuterLine: boolean = settings.outerLine.show.value;  
        if (showOuterLine) {
            this.ticksOptions = this.calcTickOptions(this.maxHeight);
            this.innerRadius /= this.ticksOptions.diffPercent;
        }

        this.arcSvg = this.getArcSvg(this.innerRadius, this.viewportRadius, this.maxHeight);
        this.outerRadius = max(this.dataPoints.map(d => this.arcSvg.outerRadius().bind(this)(d)));

        if (showOuterLine) {
            this.outerRadius *= this.ticksOptions.diffPercent;
            this.ticksRadiusArray = this.calcTicksRadius(this.ticksOptions.ticksCount, this.outerRadius);
            this.tickValuesArray = this.calcTicksValues(this.ticksOptions.ticksCount, this.ticksOptions.maxHeight);
        }
    }

    public drawCenterText(mainGroupElement: d3Selection<SVGGElement, null, HTMLElement, null>): void {
        let centerText: d3Selection<SVGTextElement, null, HTMLElement, null> = mainGroupElement.select<SVGTextElement>(DataRenderService.CenterLabelClass.selectorName);

        if (centerText.empty()) {
            centerText = mainGroupElement.append("text").classed(DataRenderService.CenterLabelClass.className, true);
        }

        centerText
            .style("line-height", 1)
            .style("font-size", this.settings.centerLabel.font.fontSize.value)
            .style("font-family", this.settings.centerLabel.font.fontFamily.value || dataLabelUtils.StandardFontFamily)
            .style("font-weight", this.settings.centerLabel.font.bold.value ? "bold" : "normal")
            .style("font-style", this.settings.centerLabel.font.italic.value ? "italic" : "normal")
            .style("text-decoration", this.settings.centerLabel.font.underline.value ? "underline" : "none")
            .style("fill", this.settings.centerLabel.color.value.value)
            .attr("text-anchor", "middle");

        centerText.text(null);

        const maxWidth = this.innerRadius * DataRenderService.CenterTextFontWidthCoefficient;

        this.data.centerText.forEach((lineContent: string, index: number) => {
            
            const lineProperties: TextProperties = {
                text: lineContent,
                fontFamily: this.settings.centerLabel.font.fontFamily.value,
                fontSize: PixelConverter.toString(this.settings.centerLabel.font.fontSize.value),
                fontWeight: this.settings.centerLabel.font.bold.value ? "bold" : "normal",
                fontStyle: this.settings.centerLabel.font.italic.value ? "italic" : "normal",
            };

            const tailoredText = textMeasurementService.getTailoredTextOrDefault(lineProperties, maxWidth);

            centerText.append("tspan")
                .attr("x", 0)
                .attr("dy", index === 0 
                    ? (this.data.centerText.length > 1 ? "-0.2em" : "0.35em") 
                    : "1.2em") 
                .text(tailoredText);
        });

        this.applyOnObjectStylesToCenterLabel(centerText);
    }

    private applyOnObjectStylesToCenterLabel(labelsSelection: d3Selection<SVGTextElement, null, HTMLElement, null>): void{
        labelsSelection
            .attr(SubSelectableObjectNameAttribute, DonutBobObjectNames.CenterLabel.name)
            .attr(SubSelectableDisplayNameAttribute, this.localizationManager.getDisplayName(DonutBobObjectNames.CenterLabel.displayNameKey))
            .attr(SubSelectableTypeAttribute, SubSelectionStylesType.Text)
            .classed(HtmlSubSelectableClass, this.formatMode && this.settings.centerLabel.show.value);
    }

    public cleanCenterText(mainGroupElement: d3Selection<SVGGElement, null, HTMLElement, null>): void {
        mainGroupElement.select<SVGTextElement>(DataRenderService.CenterLabelClass.selectorName).remove();
    }

    public renderArcs(slicesElement: d3Selection<SVGGElement, null, HTMLElement, null>, isHighlighted: boolean) {
        const arc: d3Arc<DataRenderService, d3PieArcDatum<DonutDataPoint>> = this.arcSvg;
        const classSelector: ClassAndSelector = this.getClassAndSelector(isHighlighted);

        let selection = slicesElement
            .selectAll<SVGPathElement, null>(classSelector.selectorName)
            .data(isHighlighted ? this.highlightedDataPoints : this.dataPoints, (d: d3PieArcDatum<DonutDataPoint>, i: number) => {
                return d.data
                    ? (<powerbi.visuals.ISelectionId>d.data.identity).getKey()
                    : i;
            });

        selection
            .exit()
            .remove();

        selection = selection.merge(selection
            .enter()
            .append("path")
            .attr("aria-selected", false)
            .attr("tabindex", 0)
            .attr("role", "option")
            .attr("center", (d) => arc.centroid(d).toString())
            .classed(classSelector.className, true));

        this.applyOnObjectStylesToPies(selection);

        const interpolateArc = (dataRendererService: DataRenderService, arc: d3Arc<DataRenderService, d3PieArcDatum<DonutDataPoint>>) => {
            return function (data: d3PieArcDatum<DonutDataPoint>) {
                if (!this.oldData) {
                    this.oldData = data;
                    return () => arc.call(dataRendererService, data);
                }

                const interpolation = d3Interpolate(this.oldData, data);
                this.oldData = interpolation(0);
                return (x: number) => arc.call(dataRendererService, interpolation(x));
            }
        }

        selection
            .attr("fill", d => d.data.fillColor)
            .attr("stroke", d => d.data.strokeColor)
            .attr("stroke-width", d => d.data.strokeWidth)
            .call(selection => {
                return this.layout.viewportChanged
                    ? selection
                        .transition()
                        .duration(DataRenderService.AnimationDuration)
                        .attrTween("d", interpolateArc(this, arc))
                    : selection.attr("d", (d) => arc.call(this, d));
            });

        this.applyTooltipToSelection(selection);
    }

    private applyOnObjectStylesToPies(selection: d3Selection<SVGPathElement, d3PieArcDatum<DonutDataPoint>, SVGGElement, null>): void{
        selection
            .classed(HtmlSubSelectableClass, this.formatMode)
            .attr(SubSelectableObjectNameAttribute, DonutBobObjectNames.Pies.name)
            .attr(SubSelectableDisplayNameAttribute, (d) => `"${d.data.categoryName}" ${this.localizationManager.getDisplayName("Visual_Slice")}`)
            .attr(SubSelectableTypeAttribute, SubSelectionStylesType.Shape);
    }

    private drawGrid(element: d3Selection<SVGGElement, null, HTMLElement, null>, settings: OuterLineCardSettings): void {
        const color: string = settings.color.value.value;
        const ticksCount: number = this.ticksRadiusArray.length;

        const circleAxes: d3Selection<SVGGElement, number, SVGGElement, null> = element
            .selectAll<SVGGElement, number>("g" + DataRenderService.CircleLine.selectorName)
            .data(this.ticksRadiusArray)
            .join("g")
            .classed(DataRenderService.CircleLine.className, true);

        const circle = circleAxes
            .selectAll<SVGCircleElement, number>("circle")
            .data((t) => [t])
            .join("circle");

        circle
            .attr("r", (d) => d)
            .style("opacity", function(_: number, i: number, n: SVGCircleElement[] | ArrayLike<SVGCircleElement>) {
                const nodes = circle.nodes();
                const index = nodes.indexOf(n[i]);

                if (index === ticksCount - 1 || !settings.showGrid.value) {
                    return 0;
                }

                return 0.5;
            })
            .style("stroke", color)
            .style("fill", "none");

        if (settings.showGridTicksValues.value) {
            let text = circleAxes.selectAll<SVGTextElement, number>("text").data(this.tickValuesArray);
            const textProperties: TextProperties = {
                fontFamily: dataLabelUtils.StandardFontFamily,
                fontSize: PixelConverter.toString(this.settings.outerLine.font.fontSize.value)
            };
            text.exit().remove();
            text = text.merge(text.enter().append("text"));
            text
                .attr("dy", (d: number, i: number) => { return -this.ticksRadiusArray[i] + DataRenderService.PixelsBelowAxis + (parseInt(this.settings.outerLine.font.fontSize.value.toString())); })
                .attr("dx", (d: number, i: number) => { return - textMeasurementService.measureSvgTextWidth(textProperties, this.tickValuesArray[i].toString()) / DataRenderService.AxisTextWidthCoefficient; })
                .attr("text-anchor", "middle")
                .style("font-size", this.settings.outerLine.font.fontSize.value)
                .style("fill", this.settings.outerLine.textColor.value.value)
                .style("font-family", this.settings.outerLine.font.fontFamily.value || dataLabelUtils.StandardFontFamily)
                .style("font-weight", this.settings.outerLine.font.bold.value ? "bold" : "normal")
                .style("font-style", this.settings.outerLine.font.italic.value ? "italic" : "normal")
                .style("text-decoration", this.settings.outerLine.font.underline.value ? "underline" : "none")
                .classed(DataRenderService.CircleText.className, true)
                .text((_: number, i: number) => { return this.tickValuesArray[i]; });

            this.applyOnObjectStylesToCircleText(text);

        } else {
            element.selectAll(DataRenderService.CircleText.selectorName).remove();
        }
    }

    private applyOnObjectStylesToCircleText(text: d3Selection<SVGTextElement, number, SVGGElement, number>): void{
        text
            .attr(SubSelectableObjectNameAttribute, DonutBobObjectNames.Ticks.name)
            .attr(SubSelectableDisplayNameAttribute, this.localizationManager.getDisplayName(DonutBobObjectNames.Ticks.displayNameKey))
            .attr(SubSelectableTypeAttribute, SubSelectionStylesType.Text)
            .classed(HtmlSubSelectableClass, this.formatMode && this.settings.outerLine.showGridTicksValues.value);
    }

    private drawBorderCircle(
        element: d3Selection<SVGGElement, null, HTMLElement, null>,
        circleClassName: ClassAndSelector,
        radius: number
    ): void {
        const selection = element.selectAll<SVGCircleElement, number>(circleClassName.selectorName).data([radius]);
       
        if (!this.settings.outerLine.showStraightLines.value && circleClassName === DataRenderService.InnerCircleBorder) {
            selection.remove();
            return;
        }
        
        selection.exit().remove();
        const mergedCircle = selection.enter().append("circle").merge(selection)
            .attr("class", circleClassName.className)
            .attr("fill", "none")
            .attr("opacity", 0.5)
            .attr("stroke", this.settings.outerLine.color.value.value)
            .attr("stroke-width", this.settings.outerLine.thickness.value + "px")
            .attr("r", radius);

        this.applyOnObjectStylesToOuterLines(mergedCircle);
    }

    private drawOuterStreightLines(element: d3Selection<SVGGElement, null, HTMLElement, null>) {
        const uniqueAngles = Array.from(new Set(this.dataPoints.map(d => d.startAngle)));
        const lines = element.selectAll<SVGPathElement,d3PieArcDatum<DonutDataPoint>>("path." + DataRenderService.OuterLine.className).data(uniqueAngles);
        const strokeValue = this.settings.outerLine.thickness.value;
        const strokeWidth = strokeValue + "px";

        if (this.dataPoints.length <= 1 || !this.settings.outerLine.showStraightLines.value) {
            lines.remove();
            return;
        }

        lines.exit().remove();

        const mergedLines = lines.enter().append("path").merge(lines)
            .attr("class", DataRenderService.OuterLine.className)
            .attr("fill", "none")
            .attr("opacity", 0.5)
            .attr("stroke", this.settings.outerLine.color.value.value)
            .attr("stroke-width", strokeWidth)
            .attr("d", (angle: number) => {
                const angleRad = angle - Math.PI / 2;
                const halfStrokeWidth = strokeValue / 2;
                const [cos, sin] = [Math.cos(angleRad), Math.sin(angleRad)];
                const [x1, y1] = [cos * (this.innerRadius + halfStrokeWidth), sin * (this.innerRadius + halfStrokeWidth)];
                const [x2, y2] = [cos * (this.outerRadius - halfStrokeWidth), sin * (this.outerRadius - halfStrokeWidth)];

                return `M${x1},${y1} L${x2},${y2}`;
            });

        this.applyOnObjectStylesToOuterLines(mergedLines);
    }

    private applyOnObjectStylesToOuterLines<T extends SVGElement>(
        selection: d3Selection<T, unknown, SVGGElement, null>
    ): void {
        selection
            .classed(HtmlSubSelectableClass, this.formatMode && this.settings.outerLine.show.value)
            .attr(SubSelectableObjectNameAttribute, DonutBobObjectNames.OuterLine.name)
            .attr(SubSelectableDisplayNameAttribute, this.localizationManager.getDisplayName(DonutBobObjectNames.OuterLine.displayNameKey))
            .attr(SubSelectableTypeAttribute, SubSelectionStylesType.Shape);
    }
  
    public drawOuterLines(element: d3Selection<SVGGElement, null, HTMLElement, null>): void {
        this.drawOuterStreightLines(element); 
        this.drawBorderCircle(element, DataRenderService.InnerCircleBorder, this.innerRadius);
        this.drawBorderCircle(element, DataRenderService.OuterCircleBorder, this.outerRadius);   
        const settings: DonutBobSettingsModel = this.settings;
        if (settings.outerLine.showGrid.value || settings.outerLine.showGridTicksValues.value) {
            this.drawGrid(element, settings.outerLine);
        } else {
            this.cleanGrid(element);
        }
    }

    private cleanGrid(element: d3Selection<SVGGElement, null, HTMLElement, null>): void {
        element.selectAll(DataRenderService.CircleLine.selectorName).remove();
        element.selectAll(DataRenderService.CircleText.selectorName).remove();
    }

    public cleanOuterLinesAndCircles(element: d3Selection<SVGGElement, null, HTMLElement, null>): void {    
        element.selectAll(DataRenderService.OuterLine.selectorName).remove();
        element.selectAll(DataRenderService.OuterCircleBorder.selectorName).remove();
        element.selectAll(DataRenderService.InnerCircleBorder.selectorName).remove();
        this.cleanGrid(element);
    }

    private calcTickOptions(value: number): CircleTicksOptions {
        let val: number = value > 0 ? Math.floor(value) : Math.ceil(value);
        let modifier = 1;

        if (val === 0) {
            for (let i = 0; i < value.toString().length - 3; ++i) {
                modifier *= 10;
                val = value * modifier;
                val = val > 0 ? Math.floor(val) : Math.ceil(val);

                if (val !== 0) {
                    break;
                }
            }
        }

        const step = Math.pow(10, val.toString().length - 1);
        const allTicksCount: number = Math.ceil((val) / step);
        const endPoint: number = allTicksCount * step / modifier;
        const diffPercent: number = endPoint / value;
        const threeTicks: number = 3;
        const twoTicks: number = 2;

        return {
            diffPercent,
            maxHeight: allTicksCount * step * modifier,
            ticksCount: allTicksCount % threeTicks === 0 ? threeTicks : twoTicks // 2 or 3 ticks only needed
        };
    }

    private calcTicksRadius(ticksCount: number, radius: number): number[] {
        let array: number[];

        if (ticksCount % 3 === 0) {
            array = [(radius - this.innerRadius) / 3 + this.innerRadius / this.ticksOptions.diffPercent, (radius - this.innerRadius) / 3 * 2 + this.innerRadius / this.ticksOptions.diffPercent, radius];
        } else {
            array = [(radius - this.innerRadius) / 2 + this.innerRadius / this.ticksOptions.diffPercent, radius];
        }

        return array;
    }

    private calcTicksValues(ticksCount: number, outerValue: number): number[] {
        let array: number[];

        if (ticksCount % 3 === 0) {
            array = [outerValue / 3, outerValue / 3 * 2, outerValue];
        } else {
            array = [outerValue / 2, outerValue];
        }

        return array;
    }

    private applyTooltipToSelection(selection: d3Selection<SVGPathElement, d3PieArcDatum<DonutDataPoint>, SVGGElement, null>): void {
        this.tooltipServiceWrapper.addTooltip(selection, 
            (tooltipEvent: d3PieArcDatum<DonutDataPoint>) => tooltipEvent.data?.tooltipInfo,
            (tooltipEvent: d3PieArcDatum<DonutDataPoint>) => tooltipEvent.data?.identity,
        );
    }

    private createDataPoints(data: DonutBobData, hasHighlight: boolean, totalWeight: number): d3DonutDataPoint[] {
        const pie = this.getPieLayout(totalWeight);

        return pie.bind(this)(hasHighlight
            ? data.highlightedDataPoints
            : data.dataPoints);
    }

    public getDataPoints(isHighlight: boolean): d3PieArcDatum<DonutDataPoint>[] {
        return isHighlight ? this.highlightedDataPoints : this.dataPoints;
    }

    private getClassAndSelector(isHighlighted: boolean) {
        return (isHighlighted
            ? DataRenderService.DonutHighlightedSlice
            : DataRenderService.DonutSlice);
    }

    private getPieLayout(totalWeight: number) {
        return d3Pie<DataRenderService, DonutDataPoint>()
            .sort(null)
            .value((dataPoint: DonutDataPoint) => {
                if (!this.totalWeight || !dataPoint || isNaN(dataPoint.sliceWidth)) {
                    return 0;
                }

                return dataPoint.sliceWidth / totalWeight;
            });
    }

    public computeOuterRadius(arcDescriptor: d3PieArcDatum<DonutDataPoint>): number {
        let height: number = 0;

        if (this.maxHeight) {
            const radius: number = this.viewportRadius - this.innerRadius;
            const sliceHeight = arcDescriptor
            && arcDescriptor.data
            && !isNaN(arcDescriptor.data.sliceHeight)
                ? arcDescriptor.data.sliceHeight
                : 1;

            height = radius * sliceHeight / this.maxHeight;
        }

        // The chart should shrink if data labels are on
        let heightIsLabelsOn = this.innerRadius + (this.settings.detailLabels.show.value ? height * DataRenderService.DonutRadiusRatio : height);
        // let heightIsLabelsOn = this.innerRadius + height;
        if (this.ticksOptions) {
            heightIsLabelsOn /= this.ticksOptions.diffPercent;
        }

        // Prevent from data to be inside the inner radius
        return Math.max(heightIsLabelsOn, this.innerRadius);
    }

    // BOB
    private getArcSvg(innerRadius: number = this.innerRadius, viewportRadius: number = this.viewportRadius, maxHeight: number = this.maxHeight): d3Arc<DataRenderService, d3PieArcDatum<DonutDataPoint>> {
        return d3CreateArc<DataRenderService, d3PieArcDatum<DonutDataPoint>>()
            .innerRadius(innerRadius)
            .outerRadius((arcDescriptor: d3PieArcDatum<DonutDataPoint>) => {
                let height: number = 0;

                if (this.maxHeight) {
                    const radius: number = viewportRadius - innerRadius;
                    const sliceHeight = arcDescriptor
                        && arcDescriptor.data
                        && !isNaN(arcDescriptor.data.sliceHeight)
                        ? arcDescriptor.data.sliceHeight
                        : 1;

                    if (this.settings.shape.asterType.value) {
                        height = radius * sliceHeight / maxHeight;
                    } else {
                        height = radius;
                    }
                }

                // The chart should shrink if data labels are on
                let heightIsLabelsOn = innerRadius + (this.settings.detailLabels.show.value ? height * DataRenderService.DonutRadiusRatio : height);
                // let heightIsLabelsOn = innerRadius + height;
                if (this.ticksOptions) {
                    heightIsLabelsOn /= this.ticksOptions.diffPercent;
                }

                // Prevent from data to be inside the inner radius
                return Math.max(heightIsLabelsOn, innerRadius);
            });
    }

    private lineRadCalc(d: DonutDataPoint) {
        let height: number = (this.viewportRadius - this.innerRadius) * (d && !isNaN(d.sliceHeight) ? d.sliceHeight : 1) / this.maxHeight;
        height = this.innerRadius + height * DataRenderService.DonutRadiusRatio;
        return Math.max(height, this.innerRadius);
    }

    // BOB Labels
    private labelRadCalc(d: DonutDataPoint) {
        const height: number = this.viewportRadius * (d && !isNaN(d.sliceHeight) ? d.sliceHeight : 1) / this.maxHeight + this.innerRadius;
        return Math.max(height, this.innerRadius);
    }

    public renderLabels(labelsElement: d3Selection<SVGGElement, null, HTMLElement, null>, isHighlight: boolean) {
        const dataPoints: d3DonutDataPoint[] = isHighlight ? this.highlightedDataPoints : this.dataPoints;
        if (!this.data.hasHighlights || (this.data.hasHighlights && isHighlight)) {
           
            const isLabelInside: boolean = this.settings.detailLabels.labelsOptionsGroup.position.value.value === "inside";

            const labelArcRadius = (d: d3PieArcDatum<DonutDataPoint>): number => {
                if (isLabelInside) {
                    const outerRadius = this.arcSvg.outerRadius().bind(this)(d);
                    return this.innerRadius + (outerRadius - this.innerRadius) / 2;
                }
                return this.labelRadCalc(d.data);
            };

            const labelArc = d3CreateArc<DataRenderService, d3PieArcDatum<DonutDataPoint>>()
                .innerRadius(d => labelArcRadius(d))
                .outerRadius(d => labelArcRadius(d));

            const labelLayout: ILabelLayout = this.getLabelLayout(labelArc, this.layout.viewport,isLabelInside);
            this.drawLabels(
                dataPoints.filter(x => !isHighlight || x.data.sliceHeight !== null),
                labelsElement,
                labelLayout,
                this.layout.viewport,
                isLabelInside
            );
        }
    }

    public cleanLabels(labelsElement: d3Selection<SVGGElement, null, HTMLElement, null>): void {
        dataLabelUtils.cleanDataLabels(labelsElement, true);
    }

    private calculateMiddAngleforLabels(d: d3PieArcDatum<DonutDataPoint> & LabelEnabledDataPoint) : number {
        return d.startAngle + (d.endAngle - d.startAngle) / 2;
    };

    private computeLabelLinePoints(d: d3PieArcDatum<DonutDataPoint> & LabelEnabledDataPoint): {
        lineStartPoint: [number, number],
        lineBreakPoint: [number, number],
        lineEndPoint: [number, number],
        direction: number
    } {
        const angle = this.calculateMiddAngleforLabels(d) - Math.PI / 2;
        const radius = this.arcSvg.outerRadius().call(this, d);
        const direction = this.calculateMiddAngleforLabels(d) < Math.PI ? 1 : -1;

        const lineStartPoint: [number, number] = [
            Math.cos(angle) * radius,
            Math.sin(angle) * radius
        ];

        const lineBreakPoint: [number, number] = [
            lineStartPoint[0] + Math.cos(angle) * DataRenderService.LabelLineHeight,
            lineStartPoint[1] + Math.sin(angle) * DataRenderService.LabelLineHeight
        ];

        const lineEndPoint: [number, number] = [
            lineBreakPoint[0] + direction * DataRenderService.LabelLineLegHeight,
            lineBreakPoint[1]
        ];

        return { lineStartPoint, lineBreakPoint, lineEndPoint, direction };
    }


    private drawLabels(data: d3DonutDataPoint[],
        context: d3Selection<SVGGElement, null, HTMLElement, null>,
        layout: ILabelLayout,
        viewport: IViewport,
        isLabelInside: boolean
    ): void {
        // Hide and reposition labels that overlap
        const dataLabelManager: DataLabelManager = new DataLabelManager();
        type LabelMergedDataPoint = d3PieArcDatum<DonutDataPoint> & LabelEnabledDataPoint;
        let filteredData: LabelMergedDataPoint[] = <LabelMergedDataPoint[]>dataLabelManager.hideCollidedLabels(viewport, data, layout, true /* addTransform */);

        if (filteredData.length === 0) {
            dataLabelUtils.cleanDataLabels(context, true);
            return;
        }

        // Draw labels
        if (context.select(DataRenderService.labelGraphicsContextClass.selectorName).empty()) {
            context.append("g").classed(DataRenderService.labelGraphicsContextClass.className, true);
        }

        let labels = context
            .select<SVGGElement>(DataRenderService.labelGraphicsContextClass.selectorName)
            .selectAll<SVGTextElement, d3PieArcDatum<DonutDataPoint>>(DataRenderService.DataLabels.selectorName)
            .data(
                filteredData,
                (d: d3PieArcDatum<DonutDataPoint>) => {
                    return (<ISelectionId>d.data.identity).getKey();
                });

        labels
            .exit()
            .remove();

        labels = labels.merge(
            labels
                .enter()
                .append("text")
                .classed(DataRenderService.DataLabels.className, true))
                .classed(HtmlSubSelectableClass, this.formatMode && this.settings.detailLabels.show.value)
                .attr(SubSelectableObjectNameAttribute, DonutBobObjectNames.DetailLabels.name)
                .attr(SubSelectableDisplayNameAttribute, DonutBobObjectNames.DetailLabels.name)
                .attr(SubSelectableTypeAttribute, SubSelectionStylesType.Text);

        if (!labels) {
            return;
        }

        const labelLinePointsCache = new Map();

        labels
           .attr("x", (d) => {
                if (!labelLinePointsCache.has(d)) {
                    labelLinePointsCache.set(d, this.computeLabelLinePoints(d));
                }
                const { lineEndPoint } = labelLinePointsCache.get(d);
                return  isLabelInside ? this.arcSvg.centroid(d)[0]: lineEndPoint[0];
            })
            .attr("y", (d) => {
                if (!labelLinePointsCache.has(d)) {
                labelLinePointsCache.set(d, this.computeLabelLinePoints(d));
                }
                const { lineEndPoint } = labelLinePointsCache.get(d);
                return isLabelInside ? this.arcSvg.centroid(d)[1] : lineEndPoint[1];
            })
            .attr("dy", ".35em")
            .attr("dx", (d: LabelMergedDataPoint) => { 
                if (!labelLinePointsCache.has(d)) {
                    labelLinePointsCache.set(d, this.computeLabelLinePoints(d));
                }
                const { direction } = labelLinePointsCache.get(d);
                return direction * DataRenderService.LabelLinePadding;
            })
            .text((d: LabelEnabledDataPoint) => d.labeltext)
            .style("text-anchor", layout.style["text-anchor"])
            .style("fill", this.settings.detailLabels.labelsValuesGroup.color.value.value)
            .style("font-family", this.settings.detailLabels.labelsValuesGroup.font.fontFamily.value || dataLabelUtils.StandardFontFamily)
            .style("font-weight", this.settings.detailLabels.labelsValuesGroup.font.bold.value ? "bold" : "normal")
            .style("font-style", this.settings.detailLabels.labelsValuesGroup.font.italic.value ? "italic" : "normal")
            .style("text-decoration", this.settings.detailLabels.labelsValuesGroup.font.underline.value ? "underline" : "none")
            .style("font-size", PixelConverter.fromPoint(this.settings.detailLabels.labelsValuesGroup.font.fontSize.value));

        this.applyOnObjectStylesToLabels(labels);

        if (isLabelInside) {
            context.select(DataRenderService.linesGraphicsContextClass.selectorName).remove();
            return;
        }

        // Draw lines
        if (context.select(DataRenderService.linesGraphicsContextClass.selectorName).empty())
            context.append("g").classed(DataRenderService.linesGraphicsContextClass.className, true);

        // Remove lines for null and zero values
        filteredData = filter(filteredData, (d: d3PieArcDatum<DonutDataPoint>) => d.data.sliceHeight !== null && d.data.sliceHeight !== 0);

        let lines = context
            .select(DataRenderService.linesGraphicsContextClass.selectorName)
            .selectAll<SVGPolylineElement, d3PieArcDatum<DonutDataPoint>>("polyline")
            .data(
                filteredData,
                (d: d3PieArcDatum<DonutDataPoint>) => {
                    return (<ISelectionId>d.data.identity).getKey();
                });

        lines
            .exit()
            .remove();

        lines = lines.merge(
            lines
                .enter()
                .append("polyline")
                .classed(DataRenderService.LineLabel.className, true));

        lines
            .attr("points", (d) => {
                if (!labelLinePointsCache.has(d)) {
                    labelLinePointsCache.set(d, this.computeLabelLinePoints(d));
                }   

                const { lineStartPoint, lineBreakPoint, lineEndPoint } = labelLinePointsCache.get(d);
                return [].concat(lineStartPoint, lineBreakPoint, lineEndPoint);
            })
            .style("opacity", 0.5)
            .style("fill-opacity", 0)
            .style("stroke", () => this.settings.detailLabels.labelsValuesGroup.color.value.value);
    }

    private applyOnObjectStylesToLabels(labelsSelection: d3Selection<SVGTextElement, d3PieArcDatum<DonutDataPoint> & LabelEnabledDataPoint, SVGGElement, null>): void{
        labelsSelection
            .style("pointer-events", this.formatMode ? "auto" : "none")
            .attr(SubSelectableObjectNameAttribute, DonutBobObjectNames.DetailLabels.name)
            .attr(SubSelectableDisplayNameAttribute, this.localizationManager.getDisplayName(DonutBobObjectNames.DetailLabels.displayNameKey))
            .attr(SubSelectableTypeAttribute, SubSelectionStylesType.Text)
            .classed(HtmlSubSelectableClass, this.formatMode && this.settings.detailLabels.show.value);
    }

    private getLabelLayout(arc: d3Arc<DataRenderService, d3PieArcDatum<DonutDataPoint>>, viewport: IViewport,isLabelInside: boolean): ILabelLayout {
    
        const textProperties: TextProperties = {
            text: "",
            fontFamily: this.settings.detailLabels.labelsValuesGroup.font.fontFamily.value || dataLabelUtils.StandardFontFamily,
            fontSize: PixelConverter.fromPoint(this.settings.detailLabels.labelsValuesGroup.font.fontSize.value),
            fontWeight: this.settings.detailLabels.labelsValuesGroup.font.bold ? "bold" : "normal",
            fontStyle: this.settings.detailLabels.labelsValuesGroup.font.italic ? "italic" : "normal",
        };

        const setTextAndGetLabelDimensions = (d: d3PieArcDatum<DonutDataPoint>) => {
            textProperties.text = d.data.label;
            return {
                labelWidth: textMeasurementService.measureSvgTextWidth(textProperties),
                labelHeight: textMeasurementService.estimateSvgTextHeight(textProperties)
            };
        };


        if (isLabelInside) {
            return {
                labelText: (d: d3PieArcDatum<DonutDataPoint>) => {
                   const { labelWidth, labelHeight } = setTextAndGetLabelDimensions(d);
                    const radius = arc.outerRadius().call(this, d);
                    const maxLabelRadius = (radius - this.innerRadius) * DataRenderService.InsideLabelSizeRatio;
                    
                    if (labelWidth > maxLabelRadius || labelHeight > maxLabelRadius) {
                        const tailoredText = textMeasurementService.getTailoredTextOrDefault(textProperties, maxLabelRadius);                        
                        if (!tailoredText || tailoredText.length <= 1 || tailoredText === '...') return "";
                        return tailoredText;
                    }
                    return d.data.label;
                },
                labelLayout: {
                    x: (d: d3PieArcDatum<DonutDataPoint>) => arc.centroid(d)[0],
                    y: (d: d3PieArcDatum<DonutDataPoint>) => arc.centroid(d)[1],
                },
                filter: (d: d3PieArcDatum<DonutDataPoint>) => (d != null && !isEmpty(d.data.label + "")),
                style: {
                    "text-anchor": "middle",
                }
            };
        }
       
        const labelLinePointsCache = new Map();
        const getCachedLinePoints = (d: d3PieArcDatum<DonutDataPoint>): [number, number] => {
            if (!labelLinePointsCache.has(d)) {
                const { lineEndPoint } = this.computeLabelLinePoints(d);
                labelLinePointsCache.set(d, lineEndPoint);
            }
            return labelLinePointsCache.get(d)!;
        };

      const isLabelsHasConflict = (d: d3PieArcDatum<DonutDataPoint>) => {
            const { labelWidth, labelHeight } = setTextAndGetLabelDimensions(d);
            const [ positionX, positionY ] = getCachedLinePoints(d);
            const horizontalSpaceAvailableForLabels = Math.max(0, viewport.width / 2 - Math.abs(positionX) - DataRenderService.LabelLinePadding);
            const verticalSpaceAvailableForLabels = Math.max(0, viewport.height / 2 - Math.abs(positionY) - DataRenderService.LabelLinePadding);
            d.data.isLabelHasConflict = labelWidth > horizontalSpaceAvailableForLabels || labelHeight > verticalSpaceAvailableForLabels;
            return {spaceAvailableForLabels: horizontalSpaceAvailableForLabels};
        };

        return {
            labelText: (d: d3PieArcDatum<DonutDataPoint>) => {
            textProperties.text = d.data.label;
            const {spaceAvailableForLabels } = isLabelsHasConflict(d);
            return textMeasurementService.getTailoredTextOrDefault(textProperties, spaceAvailableForLabels);
            },
            labelLayout: {
                x: (d: d3PieArcDatum<DonutDataPoint>) => {
                const [lineEndPointX] = getCachedLinePoints(d);
                return d.data.isLabelHasConflict ? lineEndPointX * DataRenderService.DonutConflictRatio : lineEndPointX;
            },
            y: (d: d3PieArcDatum<DonutDataPoint>) => {
                const [,lineEndPointY] = getCachedLinePoints(d);
                return d.data.isLabelHasConflict ? lineEndPointY * DataRenderService.DonutConflictRatio : lineEndPointY;
            },
            },
            filter: (d: d3PieArcDatum<DonutDataPoint>) => (d != null && !isEmpty(d.data.label + "")),
            style: {
                "text-anchor": (d: d3PieArcDatum<DonutDataPoint>) => this.calculateMiddAngleforLabels(d) < Math.PI ? "start" : "end",
            }
        };
    }
}