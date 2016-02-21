var React = require("react");
var ReactD3 = require("react-d3-components");
var BarChart = ReactD3.BarChart;

var graph = React.createClass({
	render(){
		return (
				<BarChart
						data={this.props.graphData}
						width={380}
						height={280}
						margin={{top: 10, bottom: 30, left: 10, right: 10}}
						colorByLabel={true}
				/>
		);
	}
});


module.exports = graph;
