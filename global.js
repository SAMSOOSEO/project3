import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let data;
let selectedGender = null;
let selectedDisorder = null;
let selectedAgeRange = null;

// ---------------- CSV 로드 ----------------
d3.csv("./lib/data.csv").then(rawData => {
  data = rawData.map(d => ({
    ...d,
    Age: +d.Age,
    "Sleep Duration": +d["Sleep Duration"],
    "Quality of Sleep": +d["Quality of Sleep"],
    "Physical Activity Level": +d["Physical Activity Level"],
    "Stress Level": +d["Stress Level"],
    "Daily Steps": +d["Daily Steps"],
    "Heart Rate": +d["Heart Rate"]
  }));

  d3.select("#dataset-size").text(`Total Dataset Size: ${data.length}`);
  drawCharts();

  // 초기 평균값 표시
  updateScatterPlot();
});


// ---------------- 차트 그리기 ----------------
function drawCharts() {
  // Gender Pie Chart
  const genderCounts = d3.rollup(data, v => v.length, d => d.Gender);
  drawPieChart("#gender-chart", genderCounts, "Gender Distribution");

  // Sleep Disorder Pie Chart
  const disorderCounts = d3.rollup(data, v => v.length, d => d["Sleep Disorder"]);
  drawPieChart("#sleep-disorder-chart", disorderCounts, "Sleep Disorder Distribution");

  // Age Bar Chart
  const ageExtent = d3.extent(data, d => d.Age);
  const thresholds = d3.range(25, Math.ceil(ageExtent[1]/5)*5 , 5);
  const ageBins = d3.bin()
    .domain([25, Math.ceil(ageExtent[1]/5)*5 + 5])
    .thresholds(thresholds)
    (data.map(d => d.Age));
  drawBarChart("#age-chart", ageBins, "Age Distribution");

  // Scatter Plot 초기화
  drawScatterPlot("#scatter-chart", data);
}

// ---------------- Scatter Plot 갱신 ----------------
function updateScatterPlot() {
  let filteredData = data;

  if (selectedGender) {
    filteredData = filteredData.filter(d => d.Gender === selectedGender);
  }
  if (selectedDisorder) {
    filteredData = filteredData.filter(d => d["Sleep Disorder"] === selectedDisorder);
  }
  if (selectedAgeRange) {
    const [minAge, maxAge] = selectedAgeRange.split("-").map(Number);
    filteredData = filteredData.filter(d => d.Age >= minAge && d.Age < maxAge + 0.001);
  }

  drawScatterPlot("#scatter-chart", filteredData);

  // 평균 계산
  if(filteredData.length > 0){
    const avgSleepDuration = d3.mean(filteredData, d => d["Sleep Duration"]);
    const avgQuality = d3.mean(filteredData, d => d["Quality of Sleep"]);

d3.select("#scatter-averages").html(`
  Data Average :
  Sleep Duration: ${avgSleepDuration.toFixed(2)}, 
  Quality of Sleep: ${avgQuality.toFixed(2)}
`);
  } 

  // 테이블도 필터링된 데이터로 갱신
  showDataTable(filteredData);
}

// ---------------- Pie Chart ----------------
function drawPieChart(selector, dataMap, title) {
  const width = 350, height = 350, radius = Math.min(width, height)/2;
  const container = d3.select(selector);
  container.html("");

  const svg = container.append("svg").attr("width", width).attr("height", height);
  const g = svg.append("g").attr("transform", `translate(${width/2},${height/2})`);

  const pie = d3.pie().value(d => d[1]);
  const arc = d3.arc().innerRadius(0).outerRadius(radius - 10);
 const color = d3.scaleOrdinal()
  .domain(["Male", "Female"])
  .range(["#95a3a0ff", "#e4bc97ff"]);
  const pieData = pie(Array.from(dataMap));

  const paths = g.selectAll("path")
    .data(pieData)
    .enter()
    .append("path")
    .attr("d", arc)
    .attr("fill", d => color(d.data[0]))
    .attr("stroke", "#fff")
    .attr("stroke-width", 1)
    .style("cursor", "pointer")
    .on("click", (event, d) => {
      const selected = d.data[0];

      if (selector.includes("gender")) {
        selectedGender = selectedGender === selected ? null : selected;
      }
      if (selector.includes("sleep-disorder")) {
        selectedDisorder = selectedDisorder === selected ? null : selected;
      }

      // 하이라이트 적용
      paths.attr("opacity", p => {
        if ((selector.includes("gender") && selectedGender && p.data[0] !== selectedGender) ||
            (selector.includes("sleep-disorder") && selectedDisorder && p.data[0] !== selectedDisorder)) {
          return 0.3;
        }
        return 1;
      });

      updateScatterPlot();
    });

  g.selectAll("text")
    .data(pieData)
    .enter()
    .append("text")
    .attr("transform", d => `translate(${arc.centroid(d)})`)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .attr("font-weight", "bold")
    .text(d => `${d.data[0]} (${d.data[1]})`);

  container.append("p")
    .style("text-align","center")
    .style("margin-top","5px")
    .style("font-weight","bold")
    .style("font-size","18px")
    .text(title);
}

// ---------------- Bar Chart ----------------
function drawBarChart(selector, bins, title) {
  const margin = {top:20, right:20, bottom:40, left:40};
  const svgWidth = 350, svgHeight = 350;
  const container = d3.select(selector);
  container.html("");

  const svg = container.append("svg")
    .attr("width", svgWidth)
    .attr("height", svgHeight)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const width = svgWidth - margin.left - margin.right;
  const height = svgHeight - margin.top - margin.bottom;

  const x = d3.scaleBand()
    .domain(bins.map(d => `${Math.floor(d.x0)}-${Math.floor(d.x1-0.001)}`))
    .range([0, width])
    .padding(0.1);

  const y = d3.scaleLinear()
    .domain([0, d3.max(bins, d=>d.length)]).nice()
    .range([height,0]);

  const bars = svg.selectAll("rect")
    .data(bins)
    .enter()
    .append("rect")
    .attr("x", d => x(`${Math.floor(d.x0)}-${Math.floor(d.x1-0.001)}`))
    .attr("y", d => y(d.length))
    .attr("width", x.bandwidth())
    .attr("height", d => height - y(d.length))
    .attr("fill", "#95a3a0ff")
    .style("cursor", "pointer")
    .on("click", (event, d) => {
      const label = `${Math.floor(d.x0)}-${Math.floor(d.x1-0.001)}`;
      selectedAgeRange = selectedAgeRange === label ? null : label;

      // 하이라이트
      bars.attr("opacity", b => (selectedAgeRange && `${Math.floor(b.x0)}-${Math.floor(b.x1-0.001)}` !== selectedAgeRange) ? 0.3 : 1);

      updateScatterPlot();
      event.stopPropagation();
    });

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x)).selectAll("text").attr("font-size","12px");

  svg.append("g")
    .call(d3.axisLeft(y).ticks(5)).selectAll("text").attr("font-size","12px");

  svg.selectAll("text.bar-label")
    .data(bins)
    .enter()
    .append("text")
    .attr("class","bar-label")
    .attr("x", d=>x(`${Math.floor(d.x0)}-${Math.floor(d.x1-0.001)}`)+x.bandwidth()/2)
    .attr("y", d=>y(d.length)-5)
    .attr("text-anchor","middle")
    .attr("font-size","12px")
    .attr("font-weight","bold")
    .text(d=>d.length);

  container.append("p")
    .style("text-align","center")
    .style("margin-top","5px")
    .style("font-weight","bold")
    .style("font-size","18px")
    .text(title);
}

function drawScatterPlot(selector, data, title) {
  const margin = {top:30,right:200,bottom:50,left:50};
  const containerWidth = document.querySelector(selector).clientWidth;
  const width = containerWidth - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const container = d3.select(selector);
  container.html("");

  // ---------------- Card 스타일 적용 ----------------
  container
    .style("background-color", "#ffffff")  // 하얀 배경
    .style("border-radius", "12px")       // 둥근 모서리
    .style("box-shadow", "0 4px 8px rgba(0,0,0,0.1)") // 부드러운 그림자
    .style("padding", "15px")
    .style("margin", "10px 0");

  const svg = container.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().domain([5.5,9.5]).range([0,width]);
  const y = d3.scaleLinear().domain([4,12]).range([height,0]);

  const occupationColors = {
    "Sales Representative": "#1f77b4",
    "Software Engineer": "#ff7f0e",
    "Teacher": "#2ca02c",
    "Nurse": "#d62728",
    "Doctor": "#9467bd",
    "Scientist": "#8c564b",
    "Lawyer": "#e377c2",
    "Accountant": "#7f7f7f",
    "Engineer": "#17becf",
    "Salesperson": "#bcbd22"
  };

  const circles = svg.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", d => x(d["Sleep Duration"]))
    .attr("cy", d => y(d["Quality of Sleep"]))
    .attr("r", 5)
    .attr("fill", d => occupationColors[d.Occupation] || "#7f7f7f")
    .attr("opacity", 0.7)
    .style("cursor","pointer");

  // ---------------- Brush ----------------
  const brush = d3.brush()
    .extent([[0, 0], [width, height]])
    .on("brush end", (event) => {
      if (!event.selection) {
        showDataTable([]);
    
        return;
      }

      const [[x0, y0], [x1, y1]] = event.selection;

      const selectedPoints = data.filter(d => {
        const cx = x(d["Sleep Duration"]);
        const cy = y(d["Quality of Sleep"]);
        return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
      });

      showDataTable(selectedPoints);

      if (selectedPoints.length > 0) {
        const avgSleepDuration = d3.mean(selectedPoints, d => d["Sleep Duration"]);
        const avgQuality = d3.mean(selectedPoints, d => d["Quality of Sleep"]);

        d3.select("#scatter-averages").html(`
          Data Average :
          Sleep Duration: ${avgSleepDuration.toFixed(2)}, 
          Quality of Sleep: ${avgQuality.toFixed(2)}
        `);
      } 

      d3.select(".selection")
        .attr("stroke", "#7e5a5aff")
        .attr("stroke-width", 1)
        .attr("fill", "#cc4e4eff")
        .attr("fill-opacity", 0.1);
    });

  svg.append("g").call(brush);

  // X축
  svg.append("g").attr("transform",`translate(0,${height})`)
    .call(d3.axisBottom(x)).selectAll("text").attr("font-size","16px");
  svg.append("text")
    .attr("x",width/2).attr("y",height+40)
    .attr("text-anchor","middle")
    .attr("font-size","18px").attr("fill","black")
    .text("Sleep Duration");

  // Y축
  svg.append("g").call(d3.axisLeft(y)).selectAll("text").attr("font-size","16px");
  svg.append("text")
    .attr("transform","rotate(-90)")
    .attr("x",-height/2).attr("y",-35)
    .attr("text-anchor","middle")
    .attr("font-size","18px").attr("fill","black")
    .text("Quality of Sleep");

  // Title
  container.append("p")
    .style("text-align","center")
    .style("margin-top","5px")
    .style("font-weight","bold")
    .style("font-size","18px")
    .text(title);

  // Legend
  const filteredOccupations = Array.from(new Set(data.map(d => d.Occupation)));
  const legend = svg.append("g").attr("transform", `translate(${width}, 0)`);
  filteredOccupations.forEach((occ, i) => {
    const col = occupationColors[occ] || "#881a1aff";
    legend.append("rect")
      .attr("x", 0)
      .attr("y", i * 30)
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", col);
    legend.append("text")
      .attr("x", 18)
      .attr("y", i * 30 + 10)
      .text(occ)
      .attr("font-size", "12px")
      .attr("alignment-baseline", "middle");
  });
}

// ---------------- 데이터 테이블 ----------------
function showDataTable(dataArray) {
  const container = d3.select("#scatter-data-table");
  container.html("");

  if(dataArray.length === 0) return;

  // ---------------- Card 스타일 적용 ----------------
  container
    .style("background-color", "#ffffff")   // 흰색 배경
    .style("border-radius", "12px")        // 둥근 모서리
    .style("box-shadow", "0 4px 8px rgba(0,0,0,0.1)") // 그림자
    .style("padding", "15px")
    .style("margin", "10px 0");

  const table = container.append("table")
    .style("border-collapse","collapse")
    .style("width","100%")
    .style("background-color", "#ffffff"); // 테이블 배경도 흰색

  const thead = table.append("thead");
  const tbody = table.append("tbody");

  const columns = Object.keys(dataArray[0]);
  thead.append("tr").selectAll("th")
    .data(columns)
    .enter().append("th")
    .text(d => d)
    .style("border","1px solid #ccc")
    .style("padding","5px")
    .style("background-color","#f2f2f2");

  const rows = tbody.selectAll("tr").data(dataArray).enter().append("tr");
  rows.selectAll("td")
    .data(d => columns.map(key => d[key]))
    .enter().append("td")
    .text(d => d)
    .style("border","1px solid #ccc")
    .style("padding","5px");
}

// ---------------- 클릭 시 필터 초기화 ----------------
document.addEventListener("click", function(event) {
  const scatterContainer = document.querySelector("#scatter-chart");
  const genderPie = document.querySelector("#gender-chart");
  const disorderPie = document.querySelector("#sleep-disorder-chart");
  const ageBar = document.querySelector("#age-chart");

  if (!scatterContainer.contains(event.target) &&
      !genderPie.contains(event.target) &&
      !disorderPie.contains(event.target) &&
      !ageBar.contains(event.target)) {

    selectedGender = null;
    selectedDisorder = null;
    selectedAgeRange = null;

    updateScatterPlot();
    showDataTable([]);

    // Pie & Bar 하이라이트 복원
    d3.selectAll("#gender-chart path").attr("opacity",1);
    d3.selectAll("#sleep-disorder-chart path").attr("opacity",1);
    d3.selectAll("#age-chart rect").attr("opacity",1);
  }
});
