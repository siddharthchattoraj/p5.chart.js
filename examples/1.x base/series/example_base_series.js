// Basic Series (Line) Chart Example (manual dataset)
const MANUAL_DATA = [
	{ label: 'A', value: 12, x: 1, y: 12 },
	{ label: 'B', value: 25, x: 2, y: 25 },
	{ label: 'C', value: 8,  x: 3, y: 8  },
	{ label: 'D', value: 19, x: 4, y: 19 },
	{ label: 'E', value: 31, x: 5, y: 31 }
];

function setup() {
	createCanvas(800, 450);
}

function draw() {
	background(255);
	series(MANUAL_DATA, {
		x: 'x',
		y: 'y',
		title: 'Basic Series Chart Example',
		subtitle: 'This is a simple interactive line chart using example data.',
		xLabel: 'X',
		yLabel: 'Y',
		tooltipColumns: [
		  {col: 'label', label: 'Label'},
		  {col: 'value', label: 'Value'}
		]
	});
}
