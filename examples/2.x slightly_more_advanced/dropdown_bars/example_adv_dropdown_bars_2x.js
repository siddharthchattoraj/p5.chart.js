/* Interactive dropdown bar chart of LA Traffic Incidents with three views:
- Normal, Segmented, and Grouped */
// This example demonstrates an integration of p5.chart.js with the greater
// p5.js ecosystem, utilizing dropdown menus and responsive design.
let data;
let areaStats;
let viewMode = 'normal';
let dropdown;

async function setup() {
  createCanvas(1200, 700);

  data = await tableToDataFrame('../la_traffic_data.csv', 'csv', 'header');

  // Extract time of day from Time Occurred
  data = data.addColumn('Hour', (row) => {
    let time = String(row['Time Occurred']).padStart(4, '0');
    return parseInt(time.substring(0, 2));
  });

  // Create age groups
  data = data.addColumn('Age Group', (row) => {
    let age = row['Victim Age'];
    if (!age || age < 0) return 'Unknown';
    if (age < 18) return 'Under 18';
    if (age < 35) return '18-34';
    if (age < 50) return '35-49';
    if (age < 65) return '50-64';
    return '65+';
  });

  // Create descent groups
  // Normalize victim descent values so blank entries become 'Unknown'
  data = data.addColumn('Descent Group', (row) => {
    let descent = String(row['Victim Descent'] || '').trim();
    let codes = {
      'A': 'Other Asian',
      'B': 'Black',
      'C': 'Chinese',
      'D': 'Cambodian',
      'F': 'Filipino',
      'G': 'Guamanian',
      'H': 'Hispanic/Latin/Mexican',
      'I': 'American Indian/Alaskan Native',
      'J': 'Japanese',
      'K': 'Korean',
      'L': 'Laotian',
      'O': 'Other',
      'P': 'Pacific Islander',
      'S': 'Samoan',
      'U': 'Hawaiian',
      'V': 'Vietnamese',
      'W': 'White',
      'X': 'Unknown',
      'Z': 'Asian Indian'
    };
    return codes[descent] || (descent ? descent : 'Unknown');
  });

  // Sort by Total Incidents descending and take top 10 for clarity
  areaStats = data.group('Area Name', { 'Date Reported': 'count' })
    .rename('Date Reported', 'Total Incidents')
    .sort('Total Incidents', 'descending')
    .head(10);

  createViewSelector();
}

// Dropdown
function createViewSelector() {
  dropdown = createSelect();
  dropdown.option('Normal View', 'normal');
  dropdown.option('Segmented View', 'segmented');
  dropdown.option('Grouped View', 'grouped');
  dropdown.selected('normal');
  dropdown.changed(() => {
    viewMode = dropdown.value();
  });

  updateDropdownPosition();
}

function updateDropdownPosition() {
  if (!dropdown) return;

  // Get canvas position
  let canvasElement = document.querySelector('canvas');
  let rect = canvasElement ? canvasElement.getBoundingClientRect() : { left: 0, top: 0 };

  // Responsive styling
  let isMobile = width < 640;
  let dropdownWidth = isMobile ? width - 40 : 180;
  let xPos = isMobile ? rect.left + 20 : rect.left + width - dropdownWidth - 20;

  dropdown.position(xPos, rect.top + 20);

  dropdown.style('font-size', isMobile ? '12px' : '14px');
  dropdown.style('padding', isMobile ? '6px' : '8px');
  dropdown.style('width', dropdownWidth + 'px');
  dropdown.style('border-radius', '4px');
  dropdown.style('border', '2px solid #D4A373');
  dropdown.style('background', '#FFF');
  dropdown.style('cursor', 'pointer');
}

function windowResized() {
  updateDropdownPosition();
}

function draw() {
  background(255, 250, 245);

  if (viewMode === 'normal') {
    drawNormalView();
  } else if (viewMode === 'segmented') {
    drawSegmentedView();
  } else if (viewMode === 'grouped') {
    drawGroupedView();
  }
}

function drawNormalView() {
  // Group by victim descent and analyze demographic distribution
  let descentData = data.group('Descent Group', { 'Date Reported': 'count' })
    .rename('Date Reported', 'Incidents')
    .sort('Incidents', 'descending');

  descentData = descentData.addColumn('Category', (row) => row['Descent Group']);

  bar(descentData, {
    x: 'Category',
    y: 'Incidents',
    title: 'LA Traffic Incidents by Victim Demographics',
    subtitle: 'Distribution across different demographic groups',
    xLabel: 'Demographic Category',
    yLabel: 'Number of Incidents',
    color: '#E76F51',
    showValues: true,
    horizontal: false,
    margin: { top: 140, right: 40, bottom: 60, left: 80 }
  });
}

function drawSegmentedView() {
  // Group by hour and create time-of-day segments
  let hourData = data.group('Hour', { 'Date Reported': 'count' })
    .rename('Date Reported', 'Incidents')
    .sort('Hour', 'ascending');

  // time period labels
  hourData = hourData.addColumn('Period', (row) => {
    let h = row['Hour'];
    if (h >= 0 && h < 6) return 'Night';
    if (h >= 6 && h < 12) return 'Morning';
    if (h >= 12 && h < 18) return 'Afternoon';
    return 'Evening';
  });

  // Pivot to create stacked view by time period
  let periodData = hourData.group('Period', { 'Incidents': 'sum' })
    .rename('Incidents', 'Total')
    .addColumn('Period Order', (row) => {
      let order = { 'Morning': 1, 'Afternoon': 2, 'Evening': 3, 'Night': 4 };
      return order[row['Period']];
    })
    .sort('Period Order', 'ascending');

  bar(periodData, {
    x: 'Period',
    y: 'Total',
    title: 'LA Traffic Incidents by Time of Day',
    subtitle: 'Distribution of incidents across different periods',
    xLabel: 'Time Period',
    yLabel: 'Number of Incidents',
    showValues: true,
    palette: ['#2C3E50', '#E67E22', '#E74C3C', '#34495E'],
    margin: { top: 140, right: 40, bottom: 60, left: 80 }
  });
}

function drawGroupedView() {
  // Group by age group and compare victim demographics
  let ageData = data.group('Age Group', { 'Date Reported': 'count' })
    .rename('Date Reported', 'Incidents')
    .addColumn('Sort Order', (row) => {
      let order = { 'Under 18': 1, '18-34': 2, '35-49': 3, '50-64': 4, '65+': 5, 'Unknown': 6 };
      return order[row['Age Group']] || 99;
    })
    .sort('Sort Order', 'ascending');

  // Add percentage column
  let total = ageData.rows.reduce((sum, row) => sum + row['Incidents'], 0);
  ageData = ageData.addColumn('Percentage', (row) => {
    return ((row['Incidents'] / total) * 100).toFixed(1);
  });

  bar(ageData, {
    x: 'Age Group',
    y: ['Incidents'],
    title: 'LA Traffic Incidents by Age Group',
    subtitle: 'Victim age distribution across all incidents',
    xLabel: 'Age Group',
    yLabel: 'Number of Incidents',
    showValues: true,
    palette: ['#3498DB', '#9B59B6', '#1ABC9C', '#F39C12', '#E74C3C', '#95A5A6'],
    margin: { top: 140, right: 40, bottom: 60, left: 80 }
  });
}
