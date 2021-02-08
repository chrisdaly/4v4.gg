import * as d3 from "d3";

function RangePlot(id, data) {
  console.log("RangePlot", data);

  var team_1 = data.teams[0].players;
  var team_2 = data.teams[0].players;
  var combined_MMR = [];
  team_1.forEach((element) => {
    combined_MMR.push(element.oldMmr);
  });
  team_2.forEach((element) => {
    combined_MMR.push(element.oldMmr);
  });

  overlay(id, team_1, team_2, combined_MMR);
}

// const { teamOneMmrs, teamOneAverageMmr, teamTwoMmrs, teamTwoAverageMmr } = data;

// function LineDataIsReady(data) {
//   console.log(data[0].teams);
// }

function overlay(id, team_1, team_2, combined_MMR) {
  const width = 300;
  const height = 350;
  const margin = { top: 52, right: 20, bottom: 20, left: 20 };

  const svg = d3
    .select(`#${id}`)
    .append("svg")
    .attr("height", height - margin.top)
    .attr("width", width);

  console.log(team_1, team_2, combined_MMR);

  const x = d3
    .scaleLinear()
    .domain([0, 4])
    .range([margin.left, width - margin.right]);

  const y = d3
    .scaleLinear()
    .domain(d3.extent(combined_MMR))
    .range([height - margin.bottom, margin.top]);

  console.log(y(1945));

  svg
    .append("path")
    .datum(combined_MMR)
    .attr("fill", "none")
    .attr("stroke", "#0000FF")
    .attr("stroke-width", 1.5)
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round")
    .attr(
      "d",
      d3
        .line()
        .x((d) => x(1.5))
        .y((d) => y(d))
        .curve(d3.curveMonotoneX)
    )
    .call(transition);

  svg
    .selectAll(".lobby_range")
    .data(d3.extent(combined_MMR))
    .enter()
    .append("text")
    .attr("class", "lobby_range")
    .attr("fill", "#0000FF")
    .attr("text-anchor", "middle")
    .attr("x", x(1.5))
    .attr("y", function (d) {
      return y(d);
    })
    .transition()
    .delay(1000)
    .text(function (d) {
      return d;
    });

  svg
    .append("path")
    .datum(team_1)
    .attr("fill", "none")
    .attr("stroke", "#0000FF")
    .attr("stroke-width", 1)
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round")
    .attr(
      "d",
      d3
        .line()
        .x((d) => x(1))
        .y((d) => y(d.oldMmr))
        .curve(d3.curveMonotoneX)
    )
    .call(transition);

  svg
    .selectAll(".team1_circles")
    .data(team_1)
    .enter()
    .append("circle")
    .attr("class", "team1_circles")
    .attr("fill", "#0000FF")
    .attr("stroke", "white")
    .attr("stroke-width", 2)
    .attr("cx", x(1))
    .attr("cy", function (d) {
      return y(d.oldMmr);
    })
    .transition()
    .delay(800)
    .duration(200)
    .attr("r", 5);

  svg
    .selectAll(".team1_bays")
    .data(team_1)
    .enter()
    .append("circle")
    .attr("class", "team1_bays")
    .attr("fill", "#0000FF")
    .attr("opacity", 0.2)
    .attr("stroke", "white")
    .attr("stroke-width", 2)
    .attr("cx", x(0))
    .attr("cy", function (d, i) {
      return ((height - margin.top) / 4) * (i + 1) - 50;
    })
    .transition()
    .delay(800)
    .duration(200)
    .attr("r", 2);

  svg
    .selectAll(".team1_rays")
    .data(team_1)
    .enter()
    .append("line")
    .attr("class", "team1_rays")
    .attr("fill", "none")
    .attr("stroke", "#0000FF")
    .attr("opacity", 0.2)
    .attr("stroke-width", 1)
    .attr("x2", x(0))
    .attr("y2", function (d, i) {
      return ((height - margin.top) / 4) * (i + 1) - 50;
    })
    .attr("x1", x(1))
    .attr("y1", function (d) {
      return y(d.oldMmr);
    })
    .call(transition);

  svg
    .selectAll(".team1_text")
    .data(team_1)
    .enter()
    .append("text")
    .attr("class", "team1_text")
    .attr("fill", "#0000FF")
    .attr("opacity", 0)
    .attr("stroke-width", 1)
    .attr("text-anchor", "end")
    .attr("x", x(0))
    .attr("y", function (d, i) {
      return ((height - margin.top) / 4) * (i + 1) - 45;
    })
    .transition()
    .delay(500)
    .attr("opacity", 0.2)
    .text(function (d) {
      return d.name + " " + d.oldMmr;
    });

  svg
    .append("path")
    .datum(team_2)
    .attr("fill", "none")
    .attr("stroke", "#0000FF")
    .attr("stroke-width", 1)
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round")
    .attr(
      "d",
      d3
        .line()
        .x((d) => x(2))
        .y((d) => y(d.oldMmr))
        .curve(d3.curveMonotoneX)
    )
    .call(transition);

  svg
    .selectAll(".team2_circles")
    .data(team_2)
    .enter()
    .append("circle")
    .attr("class", "team2_circles")
    .attr("fill", "#0000FF")
    .attr("stroke", "white")
    .attr("stroke-width", 2)

    .attr("cx", x(2))
    .attr("cy", function (d) {
      console.log(d.oldMmr);
      return y(d.oldMmr);
    })
    .transition()
    .delay(800)
    .duration(200)
    .attr("r", 5);

  svg
    .selectAll(".team2_bays")
    .data(team_2)
    .enter()
    .append("circle")
    .attr("opacity", 0.2)
    .attr("class", "team2_bays")
    .attr("fill", "#0000FF")
    .attr("stroke", "white")
    .attr("stroke-width", 2)
    .attr("cx", x(3))
    .attr("cy", function (d, i) {
      return ((height - margin.top) / 4) * (i + 1) - 50;
    })
    .transition()
    .delay(800)
    .duration(200)
    .attr("r", 2);

  svg
    .selectAll(".team2_rays")
    .data(team_2)
    .enter()
    .append("line")
    .attr("opacity", 0.2)
    .attr("class", "team2_rays")
    .attr("fill", "none")
    .attr("stroke", "#0000FF")
    .attr("stroke-width", 1)
    .attr("x2", x(3))
    .attr("y2", function (d, i) {
      return ((height - margin.top) / 4) * (i + 1) - 50;
    })
    .attr("x1", x(2))
    .attr("y1", function (d) {
      return y(d.oldMmr);
    })
    .call(transition);

  svg
    .selectAll(".team2_text")
    .data(team_2)
    .enter()
    .append("text")
    .attr("class", "team2_text")
    .attr("fill", "#0000FF")
    .attr("opacity", 0)
    .attr("stroke-width", 1)
    .attr("text-anchor", "start")
    .attr("x", x(3))
    .attr("y", function (d, i) {
      return ((height - margin.top) / 4) * (i + 1) - 45;
    })
    .transition()
    .delay(500)
    .attr("opacity", 0.2)
    .text(function (d) {
      return d.name + " " + d.oldMmr;
    });

  function transition(path) {
    path
      .transition()
      .duration(1000)
      .attrTween("stroke-dasharray", tweenDash)
      .on("end", () => {
        d3.select(this).call(transition);
      });
  }

  function tweenDash() {
    const l = this.getTotalLength(),
      i = d3.interpolateString("0," + l, l + "," + l);
    return function (t) {
      return i(t);
    };
  }
}

// function RangePlot(id, data) {
//   console.log("RANGE PLOT DRAWING", id);
//   console.log("data", data);

//   const { teamOneMmrs, teamOneAverageMmr, teamTwoMmrs, teamTwoAverageMmr } = data;
//   const margin = { top: 50, right: 50, bottom: 50, left: 50 };
//   const width = 150;
//   const height = 235;
//   const y = d3
//     .scaleLinear()
//     .domain(d3.extent([...teamOneMmrs, ...teamTwoMmrs]))
//     .range([height, 0])
//     .nice(3);

//   var yAxis = d3.axisLeft().scale(y).tickSize(2).ticks(3, ",f");

//   const svg = d3
//     .select(`#${id}`)
//     .append("svg")
//     .attr("width", width + margin.left + margin.right)
//     .attr("height", height + margin.top + margin.bottom)
//     .append("g")
//     .attr("transform", "translate(" + (width + margin.left + margin.right) / 2 + "," + margin.top + ")");

//   const middleLine = svg.append("g").attr("class", "y axis").call(yAxis).append("text").attr("class", "axistitle");

//   const leftLine = svg
//     .append("line")
//     .attr("class", "y axis teamOne")
//     .attr("x1", -50)
//     .attr("y1", (d) => y(d3.max(teamOneMmrs)))
//     .attr("x2", -50)
//     .attr("y2", (d) => y(d3.min(teamOneMmrs)));

//   const rightLine = svg
//     .append("line")
//     .attr("class", "y axis teamTwo")
//     .attr("x1", 50)
//     .attr("y1", (d) => y(d3.max(teamTwoMmrs)))
//     .attr("x2", 50)
//     .attr("y2", (d) => y(d3.min(teamTwoMmrs)));

//   svg
//     .selectAll(".dot teamOne")
//     .data(teamOneMmrs)
//     .enter()
//     .append("circle")
//     .attr("class", "dot teamOne")
//     .attr("r", 3)
//     .attr("cx", function (d) {
//       return -50;
//     })
//     .attr("cy", function (d) {
//       return y(d);
//     });

//   svg
//     .selectAll(".dot teamTwo")
//     .data(teamTwoMmrs)
//     .enter()
//     .append("circle")
//     .attr("class", "dot teamTwo")
//     .attr("r", 3)
//     .attr("cx", function (d) {
//       return 50;
//     })
//     .attr("cy", function (d) {
//       return y(d);
//     });
// }

export default RangePlot;
