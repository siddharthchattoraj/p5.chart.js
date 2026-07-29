// Basic Histogram Example (manual dataset)
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
	hist(MANUAL_DATA, {
        x: 'value',
        bins: 3,
        title: 'Basic Histogram Example',
        subtitle: 'This is a simple interactive histogram using example data.',
        xLabel: 'Value',
        yLabel: 'Frequency'
    });
}
