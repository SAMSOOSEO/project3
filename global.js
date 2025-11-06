import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

d3.csv("./lib/data.csv").then(data => {
  // ✅ 데이터 개수 표시
  d3.select("#dataset-size")
    .text(`Total Dataset Size: ${data.length}`);

  // ✅ 숫자형으로 변환
  data.forEach(d => {
    d.Age = +d.Age;
    d["Sleep Duration"] = +d["Sleep Duration"];
    d["Quality of Sleep"] = +d["Quality of Sleep"];
    d["Physical Activity Level"] = +d["Physical Activity Level"];
    d["Stress Level"] = +d["Stress Level"];
    d["Daily Steps"] = +d["Daily Steps"];
    d["Heart Rate"] = +d["Heart Rate"];
  });

  // ✅ Gender Pie Chart
  const genderCounts = d3.rollup(data, v => v.length, d => d.Gender);
  drawPieChart("#gender-chart", genderCounts, "Gender Distribution");

  // ✅ Sleep Disorder Pie Chart
  const disorderCounts = d3.rollup(data, v => v.length, d => d["Sleep Disorder"]);
  drawPieChart("#sleep-disorder-chart", disorderCounts, "Sleep Disorder Distribution");

  // ✅ Age Histogram (5년 단위)
  const ageBins = d3.bin()
    .domain(d3.extent(data, d => d.Age))
    .thresholds(d3.range(20, 65, 5))
    (data.map(d => d.Age));
  drawBarChart("#age-chart", ageBins, "Age Distribution");
});

// -------------------------------
// Pie Chart
// -------------------------------
function drawPieChart(selector, dataMap, title) {
  const width = 300, height = 300;
  const radius = Math.min(width, height) / 2;

  const container = d3.select(selector);
  const svg = container.append("svg")
    .attr("width", width)
    .attr("height", height);

  const g = svg.append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

  const pie = d3.pie().value(d => d[1]);
  const arc = d3.arc().innerRadius(0).outerRadius(radius - 10);
  const color = d3.scaleOrdinal(d3.schemeCategory10);

  const pieData = pie(Array.from(dataMap));

  g.selectAll("path")
    .data(pieData)
    .enter()
    .append("path")
    .attr("d", arc)
    .attr("fill", d => color(d.data[0]))
    .attr("stroke", "#fff")
    .attr("stroke-width", 1);

  g.selectAll("text")
    .data(pieData)
    .enter()
    .append("text")
    .attr("transform", d => `translate(${arc.centroid(d)})`)
    .attr("text-anchor", "middle")
    .attr("font-size", "11px")
    .text(d => d.data[0]);

  container.append("p")
    .attr("class", "chart-title")
    .text(title);
}

// -------------------------------
// Bar Chart
// -------------------------------
function drawBarChart(selector, bins, title) {
  const margin = { top: 20, right: 20, bottom: 40, left: 40 };
  const width = 300 - margin.left - margin.right;
  const height = 300 - margin.top - margin.bottom;

  const container = d3.select(selector);
  const svg = container.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand()
    .domain(bins.map(d => `${d.x0}-${d.x1 - 1}`))
    .range([0, width])
    .padding(0.1);

  const y = d3.scaleLinear()
    .domain([0, d3.max(bins, d => d.length)])
    .nice()
    .range([height, 0]);

  svg.selectAll("rect")
    .data(bins)
    .enter()
    .append("rect")
    .attr("x", d => x(`${d.x0}-${d.x1 - 1}`))
    .attr("y", d => y(d.length))
    .attr("width", x.bandwidth())
    .attr("height", d => height - y(d.length))
    .attr("fill", "#69b3a2");

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("font-size", "10px");

  svg.append("g")
    .call(d3.axisLeft(y).ticks(5));

  container.append("p")
    .attr("class", "chart-title")
    .text(title);
}
