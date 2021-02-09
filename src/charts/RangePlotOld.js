import * as d3 from "d3";

function RangePlot(id, data) {
  // console.log("RANGE PLOT DRAWING", id);
  // console.log("data", data);

  const { teamOneMmrs, teamTwoMmrs } = data;
  const margin = { top: 7 + 52.47 + 7 + 5, right: 5, bottom: 20 + 10, left: 5 };
  const width = 62.25 - 7;
  const height = 4 * (54.47 + 7) - 7;
  const verticalOffset = 15;

  const combinedMmrs = [...teamOneMmrs, ...teamTwoMmrs];
  let minMmr = d3.min(combinedMmrs);
  let maxMmr = d3.max(combinedMmrs);

  console.log(minMmr, maxMmr);

  const y = d3.scaleLinear().domain([minMmr, maxMmr]).range([height, 0]).nice(0);
  const jitter = (mmrList) => {
    let jittered = [mmrList[0]];
    for (let i = 1; i < mmrList.length; i++) {
      let thisValue = mmrList[i];
      let previousValue = jittered[i - 1];
      let goodValue;
      console.log(i, thisValue, previousValue, y(previousValue - thisValue));

      if (y(previousValue - thisValue) <= 10) {
        goodValue = thisValue - 100;
      } else {
        goodValue = thisValue;
      }
      jittered.push(goodValue);
    }
    return jittered;
  };

  let teamOneMmrsjitter = jitter(teamOneMmrs);
  let teamTwoMmrsjitter = jitter(teamTwoMmrs);

  var yAxis = d3.axisLeft().scale(y).tickSize(0).ticks(0, ",f");

  const svg = d3
    .select(`#${id}`)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + (width + margin.left + margin.right) / 2 + "," + margin.top + ")");

  const middleLine = svg.append("g").attr("class", "y axis middle").call(yAxis);

  middleLine
    .append("text")
    .attr("class", "axistitle")
    .text("MMR")
    .attr("x", verticalOffset - 4)
    .attr("y", y(minMmr) + verticalOffset);

  // leftLine
  svg
    .append("line")
    .attr("class", "y axis teamOne")
    .attr("x1", -verticalOffset)
    .attr("y1", (d) => y(d3.max(teamOneMmrs)))
    .attr("x2", -verticalOffset)
    .attr("y2", (d) => y(d3.min(teamOneMmrs)));

  // rightLine
  svg
    .append("line")
    .attr("class", "y axis teamTwo")
    .attr("x1", verticalOffset)
    .attr("y1", (d) => y(d3.max(teamTwoMmrs)))
    .attr("x2", verticalOffset)
    .attr("y2", (d) => y(d3.min(teamTwoMmrs)));

  // avgLine
  svg
    .append("line")
    .attr("class", "y axis avgLine")
    .attr("x1", -verticalOffset)
    .attr("y1", (d) => y(d3.mean(teamOneMmrs)))
    .attr("x2", verticalOffset)
    .attr("y2", (d) => y(d3.mean(teamTwoMmrs)));

  // rightDots
  svg
    .selectAll(".dot teamOne")
    .data(teamOneMmrsjitter)
    .enter()
    .append("circle")
    .attr("class", "dot teamOne")
    .attr("r", 4)
    .attr("cx", function (d) {
      return -verticalOffset;
    })
    .attr("cy", function (d) {
      return y(d);
    });

  // leftDots
  svg
    .selectAll(".dot teamTwo")
    .data(teamTwoMmrsjitter)
    .enter()
    .append("circle")
    .attr("class", "dot teamTwo")
    .attr("r", 4)
    .attr("cx", function (d) {
      return verticalOffset;
    })
    .attr("cy", function (d) {
      return y(d);
    });

  svg
    .selectAll(".mmr axis")
    .data(teamTwoMmrs)
    .enter()
    .append("circle")
    .attr("class", "dot teamTwo")
    .attr("r", 4)
    .attr("cx", function (d) {
      return verticalOffset;
    })
    .attr("cy", function (d) {
      return y(d);
    });
}

export default RangePlot;
