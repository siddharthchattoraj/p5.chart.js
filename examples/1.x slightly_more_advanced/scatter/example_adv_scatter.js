/* Scatter Plot: Age vs Time of Day for LA Traffic Incidents */
// This example shows the relationship between victim age and incident time
// with colors representing victim sex and point size showing incident frequency
let data;
let scatterData;

function preload() {
  if (typeof p5.prototype.registerPreloadMethod === 'function') {
    data = tableToDataFrame('../la_traffic_data.csv', 'csv', 'header');
  }
}

async function setup() {
  createCanvas(1200, 700);

  if (!data) {
    data = await tableToDataFrame('../la_traffic_data.csv', 'csv', 'header');
  }

  // Extract hour from Time Occurred
  data = data.addColumn('Hour', (row) => {
    let timeStr = String(row['Time Occurred']);
    if (!timeStr || timeStr === '' || timeStr === 'null') return null;
    timeStr = timeStr.padStart(4, '0');
    let hour = parseInt(timeStr.substring(0, 2));
    return hour >= 0 && hour <= 23 ? hour : null;
  });

  // Clean age data
  data = data.addColumn('Age', (row) => {
    let age = parseInt(row['Victim Age']);
    return !isNaN(age) ? age : null;
  });

  // Clean sex data - only keep M, F, X
  data = data.addColumn('Sex', (row) => {
    let sex = row['Victim Sex'];
    return (sex === 'M' || sex === 'F' || sex === 'X') ? sex : 'Unknown';
  });

  // Filter
  let validData = data.filter((row) => {
    return row['Hour'] !== null &&
           row['Age'] !== null &&
           row['Sex'] !== 'Unknown';
  });

  // Group by Age, Hour, and Sex to get frequencies
  let grouped = validData.group(['Age', 'Hour', 'Sex'], {
    'Date Reported': 'count'
  });

  scatterData = grouped.rename('Date Reported', 'Frequency');
}

function draw() {
  background(250);

  scatter(scatterData, {
    x: 'Hour',
    y: 'Age',
    size: 'Frequency',
    color: 'Sex',
    title: 'Traffic Incident Patterns: Age vs Time of Day',
    subtitle: 'Point size represents incident frequency and colors show victim sex',
    xLabel: 'Hour of Day (24h)',
    yLabel: 'Victim Age (years)',
    minSize: 3,
    maxSize: 18,
    pointStyle: 'filled',
    palette: ['#3498db', '#e74c3c', '#f39c12'],
    showValues: false,
    minX: 0,
    maxX: 24,
    margin: { top: 120, right: 180, bottom: 80, left: 80 },
    legend: true,
    tooltipColumns: [
      { col: 'Hour', label: 'Hour' },
      { col: 'Age', label: 'Age' },
      { col: 'Frequency', label: 'Frequency' },
      { col: 'Sex', label: 'Sex' }
    ]
  });
}
