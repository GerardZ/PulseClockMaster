// Start 7-segment display code

/* Usage:

<!DOCTYPE html>

<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>Segment Display Class</title>

    <script src="7segment.js"></script>
</head>

<body>

    <h2>Multiple Segment Displays</h2>
    <div id="display1" class="display-container"></div>

    <div id="display2"></div>
    <div id="display3"></div>
    <div id="display4"></div>
    <div id="display5"></div>
    <div id="display6"></div>

    <script>

        const display1 = new SegmentDisplay("display1", 4);
        const display2 = new SegmentDisplay("display2", 6, 5);
        const display3 = new SegmentDisplay("display3", 2, 4);
        const display4 = new SegmentDisplay("display4", 8, 25, "black", "darkgrey");
        const display5 = new SegmentDisplay("display5", 10, 15, "#BDB", "#232");
        const display6 = new SegmentDisplay("display6", 4, 10, "#999", "#111");

        display1.displayNumber("2024", [false, false, true, false]); // dot after 2nd digit
        display2.displayNumber("-12FF ");
        display3.displayNumber("42");
        display4.displayNumber("00000314", [false, false, false, false, false, true, false, false]);
        display5.displayNumber("0123456789", [false, false, false, false, false, true, false, false]);
        display6.displayNumber("1222");
    </script>

</body>

</html>

*/

/* TODO:
- resolve scaling
- resolve dot positioning
- upgrade dot construction, accept string with dot and someway to set a fixed dot position
- colorschemes ?
- add bezel ?
*/

globalThis.svgNS = "http://www.w3.org/2000/svg";

class SegmentDisplay {

    static nextId = 0;

    static minusSignShape = "0,8 6,8 6,10 0,10";

    static SEGMENT_SHAPES = {
        a: "1,1 2,0 8,0 9,1 8,2 2,2",
        b: "9,1 10,2 10,8 9,9 8,8 8,2",
        c: "9,9 10,10 10,16 9,17 8,16 8,10",
        d: "9,17 8,18 2,18 1,17 2,16 8,16",
        e: "1,17 0,16 0,10 1,9 2,10 2,16",
        f: "1,9 0,8 0,2 1,1 2,2 2,8",
        g: "1,9 2,8 8,8 9,9 8,10 2,10",
        dot: "circle"
    };

    static DIGIT_SEGMENTS = {
        "0": ["a", "b", "c", "d", "e", "f"],
        "1": ["b", "c"],
        "2": ["a", "b", "g", "e", "d"],
        "3": ["a", "b", "c", "d", "g"],
        "4": ["f", "g", "b", "c"],
        "5": ["a", "f", "g", "c", "d"],
        "6": ["a", "f", "e", "d", "c", "g"],
        "7": ["a", "b", "c"],
        "8": ["a", "b", "c", "d", "e", "f", "g"],
        "9": ["a", "b", "c", "d", "f", "g"],
        "-": ["g"],
        " ": [],
        "A": ["a", "b", "c", "e", "f", "g"],
        "B": ["f", "e", "d", "c", "g"],
        "C": ["a", "f", "e", "d"],
        "D": ["b", "c", "d", "e", "g"],
        "E": ["a", "f", "e", "d", "g"],
        "F": ["a", "f", "e", "g"]
    };

    constructor(
        parentId,
        digits = 4,
        scale = 1,
        bgColor = "#422",
        fgColor = "red"
    ) {
        this.digitWidth = 12; // in SVG units
        this.clockSeparatorWidth = 8; // in SVG units
        this.digitHeight = 20; // in SVG units
        this.defXOffset = 2; // in SVG units
        this.defYOffset = 1; // in SVG units

        this.numberOfDigits = this.cleanNumberString(this.numberToString(digits)).length;

        this.isClockDisplay = false;
        this.hasMinusSign = false;

        this.bgColor = bgColor
        this.fgColor = fgColor;

        this.parent = document.getElementById(parentId);

        this.scale = scale;

        this.width = this.digitCount * this.digitWidth * scale;
        if (this.isClockDisplay == true) {
            this.width += this.clockSeparatorWidth * scale;
        }
        this.height = this.digitHeight * scale;

        this.instanceId = SegmentDisplay.nextId++;

        this.wrapperId = `display-wrapper-${this.instanceId}`;
        this.containerId = `display-${this.instanceId}`;

        // css classes
        this.svgCss = "width: 100%; height: 100%; width: auto; max-width: 100%; display: block;" 
        this.displayWrapperContainer = "width: fit-content; height: fit-content; padding-left: 4px; padding-right: 2px;";
        this.displayWrapper = "transform-origin: top left;";
        this.digitContainerClass = "display: flex;"
        this.displayWrapperContainer = "width: fit-content;";
        this.digit = "";
        this.segment = "opacity: 0.3;"
        this.on = "opacity: 1;";


        // Create style element in JS, we want everything in one file
        // some classes are empty for now, but are used for selecting elements
        const style = document.createElement('style');
        style.textContent = `
        .segment {   opacity: 0.1;}
        .segOn {     opacity: 1;}
        .clockDot {}
        .minusSign {}
        `;
        document.head.appendChild(style);

        this.createDisplaySvg(this.parent, digits);
    }

    numberToString(num) {
        if (typeof num === "number") {
            return ''.padStart(num, '0');
        }
        return num;
    }

    alignToRight(numStr) {
        return numStr.padStart(this.numberOfDigits, ' ');
    }

    createDisplaySvg(parent, format) {
        const svg = document.createElementNS(svgNS, "svg");
        // in the string we use a \x20 as space since jsmin in CompressHtml.py will bollock that up for us, ugly workaround need for better minifier
        svg.setAttribute("viewBox", `0 0 ${this.width / this.scale}\x20${this.height / this.scale}`);
        svg.setAttribute("style", this.svgCss);
        svg.style.background = this.bgColor;

        if (typeof format === "number") {
            format = '0'.repeat(format);
        }

        var i = 0;
        var offset = this.defXOffset
        
        for (const char of format) {
            if (!isNaN(char)) {
                offset += this.createDigitGroup(svg, offset, i);
                i++;
            }
            else if (char === ":") {
                offset += this.createClockSeparator(svg, offset);
            }
            else if (char === "-") {
                offset += this.createMinusSign(svg, offset);
            }
        }

        // in the string we use a \x20 as space since jsmin in CompressHtml.py will bollock that up for us, ugly workaround need for better minifier
        svg.setAttribute("viewBox", `0 0 ${offset}\x20${this.height / this.scale}`);
        
        parent.appendChild(svg);
    }

    createMinusSign(ParentSvg, offset) {
        const group = document.createElementNS(svgNS, "g");
        group.setAttribute("transform", `skewX(-3) translate(${offset}, ${this.defYOffset})`);
        group.setAttribute("style", `fill-rule:evenodd; stroke:${this.bgColor}; stroke-width:0.5; stroke-opacity:1; stroke-linecap:butt; stroke-linejoin:miter;`);

        const minusSign = document.createElementNS(svgNS, "polygon");
        minusSign.setAttribute("points", SegmentDisplay.minusSignShape);
        minusSign.classList.add("minusSign");
        minusSign.classList.add("segment");
        minusSign.setAttribute("fill", this.fgColor);
        group.appendChild(minusSign);
        ParentSvg.appendChild(group);
        this.hasMinusSign = true;
        return 7; // width in SVG units
    }

    createClockSeparator(ParentSvg, offset) {
        const group = document.createElementNS(svgNS, "g");
        group.setAttribute("transform", "skewX(-3)");
        group.setAttribute("transform", `skewX(-3) translate(${offset}, ${this.defYOffset})`);
        group.setAttribute("style", `fill-rule:evenodd; stroke:${this.bgColor}; stroke-width:0.5; stroke-opacity:1; stroke-linecap:butt; stroke-linejoin:miter;`);

        for (let i = 0; i < 2; i++) {
            const dot = document.createElementNS(svgNS, "circle");
            dot.setAttribute("cx", 2);
            dot.setAttribute("cy", this.defYOffset + 4 + i * 8);
            dot.setAttribute("r", 1.2);
            dot.classList.add("clockDot");
            dot.classList.add("segment");
            dot.setAttribute("fill", this.fgColor);
            group.appendChild(dot);
        }

        ParentSvg.appendChild(group);
        return 5; // width in SVG units
    }

    createDigitGroup(ParentSvg, offset, id) {

        const group = document.createElementNS(svgNS, "g");
        group.setAttribute("transform", `skewX(-3) translate(${offset}, ${this.defYOffset})`);
        group.setAttribute("style", `fill-rule:evenodd; stroke:${this.bgColor}; stroke-width:0.5; stroke-opacity:1; stroke-linecap:butt; stroke-linejoin:miter;`);

        for (const [name, points] of Object.entries(SegmentDisplay.SEGMENT_SHAPES)) {  // scans all elements of the 7-sement plus dot
            let shape;
            if (name === "dot") {
                shape = document.createElementNS(svgNS, "circle");
                shape.setAttribute("cx", 11);
                shape.setAttribute("cy", 17);
                shape.setAttribute("r", 1);
            } else {
                shape = document.createElementNS(svgNS, "polygon");
                shape.setAttribute("points", points);
            }
            //console.log(`digit-${this.containerId}-${id}-seg-${name}`);
            shape.setAttribute("id", `digit-${this.containerId}-${id}-seg-${name}`);
            shape.setAttribute("class", "segment");
            shape.setAttribute("fill", this.fgColor);
            group.appendChild(shape);
        }

        ParentSvg.appendChild(group);
        return this.digitWidth;
    }

    setDigit(index, value, showDot = false) {
        const onSegments = SegmentDisplay.DIGIT_SEGMENTS[value] || [];
        const allSegs = Object.keys(SegmentDisplay.SEGMENT_SHAPES);
        for (const seg of allSegs) {
            const el = document.getElementById(`digit-${this.containerId}-${index}-seg-${seg}`);
            if (!el) continue;
            const isOn = seg === "dot" ? showDot : onSegments.includes(seg);
            el.classList.toggle("segOn", isOn);
        }
    }

    setClockDots(state) {
        const dotElements = this.parent.querySelectorAll(".clockDot");
        dotElements.forEach(dot => {
            dot.classList.toggle("segOn", state);
        });
    }

    setMinusSign(state) {
        const dotElements = this.parent.querySelectorAll(".minusSign");
        dotElements.forEach(dot => {
            dot.classList.toggle("segOn", state);
        });
    }

    cleanNumberString(numStr) {
        return String(numStr).toUpperCase().replace(/[^0-9A-F]/g, "");
    }

    displayNumber(numStr, dots = []) {
        const cleanedAndAligned = this.alignToRight(this.cleanNumberString(numStr));
        // FIXME handle dot

        [...cleanedAndAligned].forEach((char, idx) => {
            const showDot = Array.isArray(dots) ? dots[idx] : false;
            this.setDigit(idx, char, showDot);
        });
    }
}
